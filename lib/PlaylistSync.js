const Logger = require('../utils/Logger')
const { getUser, setLastSyncForUser } = require('./DataAccess')
const { SpotifyAPI } = require('./SpotifyAPI')

function removeItemAtIndex(array, index) {
    return [...array.slice(0, index), ...array.slice(index + 1, array.length)]
}

function addItemAtIndex(array, index, item) {
    return [...array.slice(0, index), item, ...array.slice(index, array.length)]
}

async function getSpotifyApiAndPlaylist(userId) {
    const user = await getUser(userId)

    if (!user.sync_active || !user.managed_playlist_id) {
        // Sync not active or managed playlist not created
        return
    }

    const spotifyApi = await SpotifyAPI.fromUserId(userId)

    // Ensure managed playlist still exists
    const playlist = await spotifyApi.getUserPlaylist(user.managed_playlist_id)

    return {
        spotifyApi,
        playlist: playlist.data,
        lastSync: user.lastSync ? user.lastSync : null,
    }
}

function calculatePlaylistOperationStack(_likedTracks, _playlistTracks) {
    const likedTracks = [..._likedTracks]
    let playlistTracks = [..._playlistTracks]

    const operationStack = []

    // Determine which tracks are to be deleted from the managed playlist first
    for (
        let playlistIdx = 0;
        playlistIdx < playlistTracks.length;
        playlistIdx++
    ) {
        const playlistTrack = playlistTracks[playlistIdx]

        if (!likedTracks.includes(playlistTrack)) {
            operationStack.push({
                action: 'remove',
                track: playlistTrack,
            })

            playlistTracks = removeItemAtIndex(playlistTracks, playlistIdx)

            playlistIdx -= 1
        }
    }

    for (
        let likedTrackIdx = 0;
        likedTrackIdx < likedTracks.length;
        likedTrackIdx++
    ) {
        const likedTrack = likedTracks[likedTrackIdx]
        const playlistTrack = playlistTracks[likedTrackIdx]

        if (likedTrack === playlistTrack) {
            // Same track at the same position, do nothing
            continue
        }

        if (playlistTracks.includes(likedTrack)) {
            // Track is present in both playlists, but not at the same position
            // Move it to the correct position in the managed playlist

            const playlistTrackIdx = playlistTracks.findIndex(
                (track) => track === likedTrack,
            )

            operationStack.push({
                action: 'move',
                track: likedTrack,
                fromIdx: playlistTrackIdx,
                toIdx: likedTrackIdx,
            })

            playlistTracks = removeItemAtIndex(playlistTracks, playlistTrackIdx)
            playlistTracks = addItemAtIndex(
                playlistTracks,
                likedTrackIdx,
                likedTrack,
            )
        }

        if (!playlistTracks.includes(likedTrack)) {
            // Does not exist in managed playlist, add it in at that position

            operationStack.push({
                action: 'add',
                track: likedTrack,
                index: likedTrackIdx,
            })

            playlistTracks = addItemAtIndex(
                playlistTracks,
                likedTrackIdx,
                likedTrack,
            )
        }
    }

    return operationStack
}

// Partition similar operations together from the operation stack
function partitionOperationsStack(operationStack) {
    const partitionedOperations = []

    let tempStack = []
    let currentAction = null

    for (let i = 0; i < operationStack.length; i++) {
        const item = operationStack[i]

        if (currentAction != item.action) {
            if (tempStack.length != 0) {
                partitionedOperations.push(tempStack)
            }

            currentAction = item.action
            tempStack = []
        }

        tempStack.push(item)

        if (i == operationStack.length - 1) {
            partitionedOperations.push(tempStack)
        }
    }

    return partitionedOperations
}

// Combine operations that can be made in 1 API call
function batchOperationStack(partitionedOperationStack) {
    let batchOperations = []

    for (let i = 0; i < partitionedOperationStack.length; i++) {
        const operationStack = partitionedOperationStack[i]
        const action = operationStack[0].action

        if (action === 'remove') {
            // Can combine all removes together
            batchOperations.push({
                action: 'batch-remove',
                tracks: operationStack.map((op) => op.track),
            })
        }

        if (action === 'add') {
            // Can combine sequential adds together
            let currentPlaylistIdx = -1
            let tempOperation = []

            for (
                let operationIdx = 0;
                operationIdx < operationStack.length;
                operationIdx++
            ) {
                const operation = operationStack[operationIdx]

                tempOperation.push(operation)

                if (currentPlaylistIdx === -1) {
                    currentPlaylistIdx = operation.index
                    continue
                }

                if (
                    currentPlaylistIdx != operation.index - 1 ||
                    operationIdx === operationStack.length - 1 ||
                    tempOperation.length > 50
                ) {
                    batchOperations.push({
                        action: 'batch-add',
                        index: tempOperation[0].index,
                        tracks: tempOperation.map((op) => op.track),
                    })

                    currentPlaylistIdx = -1
                    tempOperation = []

                    continue
                }

                currentPlaylistIdx = operation.index
            }
        }

        if (action === 'move') {
            // Moves can not be batched together
            batchOperations = [...batchOperations, ...operationStack]
        }
    }

    return batchOperations
}

async function commitBatchAddOperation(spotifyApi, playlistId, operation) {
    const { tracks, index } = operation

    const response = await spotifyApi.insertUserPlaylistTracks(
        playlistId,
        tracks,
        index,
    )

    Logger.info({
        service: 'playlist-sync',
        message: `Performed BATCH-ADD Operation`,
        playlistId,
        operation: operation,
    })

    return response.data.snapshot_id
}

async function commitBatchRemoveOperation(
    spotifyApi,
    playlistId,
    snapshotId,
    operation,
) {
    const { tracks } = operation

    const response = await spotifyApi.deleteUserPlaylistTracks(
        playlistId,
        snapshotId,
        tracks,
    )

    Logger.info({
        service: 'playlist-sync',
        message: `Performed BATCH-REMOVE Operation`,
        playlistId,
        snapshotId,
        operation: operation,
    })

    return response.data.snapshot_id
}

async function commitMoveOperation(
    spotifyApi,
    playlistId,
    snapshotId,
    operation,
) {
    const { fromIdx, toIdx } = operation

    const response = await spotifyApi.moveUserPlaylistTracks(
        playlistId,
        snapshotId,
        fromIdx,
        toIdx,
        1,
    )

    Logger.info({
        service: 'playlist-sync',
        message: `Performed MOVE Operation`,
        playlistId,
        snapshotId,
        operation: operation,
    })

    return response.data.snapshot_id
}

async function commitOperations(
    spotifyApi,
    playlistId,
    snapshotId,
    operations,
) {
    Logger.info({
        service: 'playlist-sync',
        message: `Performing change set commit.`,
    })

    for (const operation of operations) {
        const action = operation.action

        switch (action) {
            case 'batch-remove':
                snapshotId = await commitBatchRemoveOperation(
                    spotifyApi,
                    playlistId,
                    snapshotId,
                    operation,
                )
                break
            case 'batch-add':
                snapshotId = await commitBatchAddOperation(
                    spotifyApi,
                    playlistId,
                    operation,
                )
                break
            case 'move':
                snapshotId = await commitMoveOperation(
                    spotifyApi,
                    playlistId,
                    snapshotId,
                    operation,
                )
                break
        }
    }
}

async function playlistSync(userId) {
    const { spotifyApi, playlist } = await getSpotifyApiAndPlaylist(userId)

    // Get all liked tracks
    const likedTracks = await spotifyApi.getAllPrivateLikes()

    // Get all playlist tracks
    const playlistTracks = await spotifyApi.getAllPlaylistTracks(playlist.id)

    const likedTrackIds = likedTracks.map((item) => item.track.uri)
    const playlistTrackIds = playlistTracks.map((item) => item.track.uri)

    Logger.info({
        service: 'playlist-sync',
        message: `Found ${likedTracks.length} liked tracks.`,
        trackIds: likedTrackIds,
    })

    Logger.info({
        service: 'playlist-sync',
        message: `Found ${playlistTrackIds.length} playlist tracks.`,
        trackIds: playlistTrackIds,
    })

    // Create playlist changeset
    const changeOperations = calculatePlaylistOperationStack(
        likedTrackIds,
        playlistTrackIds,
    )

    Logger.info({
        service: 'playlist-sync',
        message: `Determined ${changeOperations.length} change operations.`,
        operations: changeOperations,
    })

    // Partition operations together
    const partitionedOperations = partitionOperationsStack(changeOperations)

    Logger.info({
        service: 'playlist-sync',
        message: `Determined ${partitionedOperations.length} change operation partitions.`,
        operations: partitionedOperations,
    })

    // Batch changeset
    const batchOperations = batchOperationStack(partitionedOperations)

    Logger.info({
        service: 'playlist-sync',
        message: `Determined ${batchOperations.length} change batched operations.`,
        operations: batchOperations,
    })

    // Commit changeset to Spotify
    await commitOperations(spotifyApi, userId, playlist.id, batchOperations)

    // Update last_sync
    await setLastSyncForUser(userId)
}

module.exports = { playlistSync }
