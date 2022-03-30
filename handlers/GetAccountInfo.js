// Gets basic account info

const { getUser } = require('../lib/DataAccess')
const { SpotifyAPI } = require('../lib/SpotifyAPI')
const Logger = require('../utils/Logger')
const { Response } = require('../utils/Response')

module.exports.handler = async function (event) {
    const userId = event.requestContext.authorizer.lambda.user_id

    try {
        const user = await getUser(userId)

        const spotifyApi = await SpotifyAPI.fromUserId(userId)

        const spotifyProfile = await spotifyApi.getUser()

        let playlist = null

        if (user.managed_playlist_id) {
            const playlistResponse = await spotifyApi.getUserPlaylist(
                user.managed_playlist_id,
            )

            playlist = {
                id: playlistResponse.data.id,
                name: playlistResponse.data.name,
                spotify_url: playlistResponse.data.external_urls.spotify,
                total_tracks: playlistResponse.data.tracks.total,
                images: playlistResponse.data.images,
                followers: playlistResponse.data.followers.total,
            }
        }

        return Response.OK({
            id: userId,
            display_name: spotifyProfile.data.display_name,
            images: spotifyProfile.data.images,
            sync_active: user.sync_active,
            last_sync: user.last_sync,
            playlist,
        })
    } catch (ex) {
        Logger.error({
            service: 'auto-playlist-sync-handler',
            message: `Failed to get information for User ${userId}`,
            exception: ex,
        })

        return Response.Error(
            500,
            {},
            'Failed to get account details. Try again later.',
        )
    }
}
