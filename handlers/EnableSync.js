// Create Managed Playlist and enable syncing

const { getUser, setSyncActiveForUser } = require('../lib/DataAccess')
const { SpotifyAPI } = require('../lib/SpotifyAPI')
const Logger = require('../utils/Logger')
const { Response } = require('../utils/Response')

module.exports.handler = async function (event, context) {
    const userId = '' // TODO

    try {
        const user = await getUser(userId)

        if (user.sync_active) {
            return Response.Error(500, {}, 'Sync is already enabled.')
        }

        const spotifyApi = await SpotifyAPI.fromUserId(userId)

        // Create managed playlist
        const playlistResponse = await spotifyApi.createUserPlaylist(
            userId,
            'Liked Songs',
            'Playlist managed by spotify-likes-playlist (https://github.com/jamiecermak/spotify-likes-playlist)',
        )

        const playlistId = playlistResponse.data.id

        await setSyncActiveForUser(userId, playlistId)

        return Response.OK()
    } catch (ex) {
        Logger.error({
            service: 'auto-playlist-sync-handler',
            message: `Failed to enable Sync for User ${userId}`,
            exception: ex,
        })

        return Response.Error(
            500,
            {},
            'Failed to enable syncing. Try again later.',
        )
    }
}
