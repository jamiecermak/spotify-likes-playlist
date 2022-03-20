const { default: axios } = require('axios')
const { updateUserCredentials, getUser } = require('./DataAccess')
const { SpotifyAuthAPI } = require('./SpotifyAuthAPI')

class SpotifyAPI {
    constructor(accessToken) {
        this.client = axios.create({
            baseURL: 'https://api.spotify.com',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })
    }

    static async fromUserId(userId) {
        const user = await getUser(userId)

        let { access_token, refresh_token } = user

        // If access token has expired, refresh and update token
        if (SpotifyAuthAPI.accessTokenExpired(user.expires_at)) {
            // Get new access token
            const authResult = await SpotifyAuthAPI.refreshAccessToken(
                refresh_token,
            )

            access_token = authResult.data.access_token
            refresh_token = authResult.data.refresh_token
            const expires_in = authResult.data.expires_in

            // Update user
            await updateUserCredentials(
                userId,
                access_token,
                refresh_token,
                expires_in,
            )
        }

        return new SpotifyAPI(access_token)
    }

    getUser() {
        return this.client.get('/v1/me')
    }

    getUserPlaylist(id) {
        return this.client.get(`/v1/playlists/${id}`)
    }

    createUserPlaylist(userId, name, description, _public = true) {
        return this.client.post(`/v1/users/${userId}/playlists`, {
            name,
            description,
            public: _public,
        })
    }

    updateUserPlaylist(id, payload) {
        return this.client.put(`/v1/playlists/${id}`, payload)
    }

    updateUserPlaylistTracks(id, payload) {
        return this.client.put(`/v1/playlists/${id}/tracks`, payload)
    }

    insertUserPlaylistTracks(id, trackUris, position) {
        return this.client.post(`/v1/playlists/${id}/tracks`, {
            uris: trackUris,
            position,
        })
    }

    deleteUserPlaylistTracks(id, snapshot_id, trackUris) {
        return this.client.delete(`/v1/playlists/${id}/tracks`, {
            data: {
                tracks: trackUris.map((uri) => ({ uri })),
                snapshot_id,
            },
        })
    }

    moveUserPlaylistTracks(
        id,
        snapshot_id,
        range_start,
        insert_before,
        range_length,
    ) {
        return this.client.put(`/v1/playlists/${id}/tracks`, {
            snapshot_id,
            range_start,
            insert_before,
            range_length,
        })
    }

    getPrivateLikes(limit = 50, offset = 0) {
        if (limit <= 0 || limit > 50) {
            throw new Error('Out of Range: Spotify Private Likes Limit')
        }

        return this.client.get(`/v1/me/tracks?limit=${limit}&offset=${offset}`)
    }

    async getAllPrivateLikes() {
        let allItems = []
        const requestState = {
            hasNextPage: true,
            limit: 50,
            offset: 0,
        }

        while (requestState.hasNextPage) {
            const { limit, offset } = requestState
            const likesRequest = await this.getPrivateLikes(limit, offset)

            const { next, items } = likesRequest.data

            allItems = [...allItems, ...items]

            requestState.hasNextPage = next !== null
            requestState.offset += 50
        }

        return allItems
    }

    getPlaylistTracks(playlistId, limit = 50, offset = 0) {
        if (limit <= 0 || limit > 50) {
            throw new Error('Out of Range: Spotify Playlist Tracks Limit')
        }

        return this.client.get(
            `/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        )
    }

    async getAllPlaylistTracks(playlistId) {
        let allItems = []
        const requestState = {
            hasNextPage: true,
            limit: 50,
            offset: 0,
        }

        while (requestState.hasNextPage) {
            const { limit, offset } = requestState

            const playlistRequest = await this.getPlaylistTracks(
                playlistId,
                limit,
                offset,
            )

            const { next, items } = playlistRequest.data

            allItems = [...allItems, ...items]

            requestState.hasNextPage = next !== null
            requestState.offset += 50
        }

        return allItems
    }
}

module.exports = { SpotifyAPI }
