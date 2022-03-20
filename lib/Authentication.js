const Logger = require('../utils/Logger')
const {
    getUser,
    createNewUser,
    updateUserCredentials,
} = require('./DataAccess')
const { SpotifyAPI } = require('./SpotifyAPI')
const { SpotifyAuthAPI } = require('./SpotifyAuthAPI')
const jwt = require('jsonwebtoken')
const { SLP_JWT_SECRET } = require('../utils/Environment')

async function getOrCreateUserBySpotifyAuthCode(authCode) {
    try {
        // Attempt to get Access and Refresh Tokens
        const authResult = await SpotifyAuthAPI.getAccessToken(authCode)

        if (!authResult.access_token || !authResult.refresh_token) {
            throw new Error(
                'Spotify Auth: Missing Access Token or Refresh Token',
            )
        }

        const { access_token, refresh_token, expires_in } = authResult.data

        // Get User Info
        const spotifyApi = new SpotifyAPI(access_token)

        const spotifyUser = await spotifyApi.getUser()

        const { display_name, id } = spotifyUser.data

        // Attempt to find User by Spotify Sub
        const user = await getUser(id)

        // If not found, create new User
        if (user === null) {
            return createNewUser(
                id,
                display_name,
                access_token,
                refresh_token,
                expires_in,
            )
        }

        // Otherwise update user credentials
        await updateUserCredentials(id, access_token, refresh_token, expires_in)

        return id
    } catch (ex) {
        Logger.warn({
            message: 'Failed to Authorise User by Spotify Auth Code',
            exception: ex,
        })

        throw ex
    }
}

async function generateJWT(authCode) {
    const userId = await getOrCreateUserBySpotifyAuthCode(authCode)

    return jwt.sign({ id: userId }, SLP_JWT_SECRET)
}

async function validateJWT(token) {
    const { id } = jwt.verify(token, SLP_JWT_SECRET)

    const user = await getUser(id)

    return {
        ...user,
        access_token: undefined,
        refresh_token: undefined,
        expires_at: undefined,
    }
}

module.exports = {
    getOrCreateUserBySpotifyAuthCode,
    generateJWT,
    validateJWT,
}
