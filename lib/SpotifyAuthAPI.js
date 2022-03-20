const { default: axios } = require('axios')
const url = require('url')
const {
    SLP_SPOTIFY_CLIENT_ID,
    SLP_SPOTIFY_CLIENT_SECRET,
    SLP_SPOTIFY_REDIRECT_URI,
} = require('../utils/Environment')
const { default: addDates } = require('date-fns/add')
const { default: isBefore } = require('date-fns/isBefore')

const client = axios.create({
    baseURL: 'https://accounts.spotify.com',
    headers: {
        Authorization: `Basic ${Buffer.from(
            `${SLP_SPOTIFY_CLIENT_ID}:${SLP_SPOTIFY_CLIENT_SECRET}`,
        )}`,
    },
})

class SpotifyAuthAPI {
    static accessTokenExpired(expires_at) {
        return isBefore(new Date(expires_at), new Date())
    }

    static calculateExpiresAt(expires_in) {
        return addDates(new Date(), expires_in)
    }

    static refreshAccessToken(refreshToken) {
        const payload = new url.URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        })

        return client.post(`/api/token`, payload.toString())
    }

    static getAccessToken(accessCode) {
        const payload = new url.URLSearchParams({
            grant_type: 'authorization_code',
            redirect_uri: SLP_SPOTIFY_REDIRECT_URI,
            code: accessCode,
        })

        return client.post(`/api/token`, payload.toString())
    }
}

module.exports = { SpotifyAuthAPI }
