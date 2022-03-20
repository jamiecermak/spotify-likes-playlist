// Gets basic account info

const { getUser } = require('../lib/DataAccess')
const { SpotifyAPI } = require('../lib/SpotifyAPI')
const Logger = require('../utils/Logger')
const { Response } = require('../utils/Response')

module.exports.handler = async function (event, context) {
    const userId = '' // TODO

    try {
        const user = await getUser(userId)

        const spotifyApi = await SpotifyAPI.fromUserId(userId)

        let playlist = null

        if (user.managed_playlist_id) {
            const playlistResponse = await spotifyApi.getUserPlaylist(
                userId,
                user.managed_playlist_id,
            )

            playlist = {
                id: playlistResponse.data.id,
                name: playlistResponse.data.name,
                spotify_url: playlistResponse.data.external_urls.spotify,
                total_tracks: playlistResponse.data.tracks.total,
            }
        }

        return Response.OK({
            id: userId,
            display_name: user.display_name,
            sync_active: user.sync_active,
            last_sync: user.last_sync,
            playlist,
        })
    } catch (ex) {
        Logger.error({
            service: 'auto-playlist-sync-handler',
            message: `Failed to get information for User ${userId}`,
            event,
            context,
            exception: ex,
        })

        return Response.Error(
            500,
            {},
            'Failed to get account details. Try again later.',
        )
    }
}
