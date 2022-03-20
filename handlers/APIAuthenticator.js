// Takes in an Auth Code from Spotify
// Creates/Gets associated Account from DB
// Returns a JWT for the API Auth

const { generateJWT } = require('../lib/Authentication')
const { Response } = require('../utils/Response')

module.exports.handler = async (event) => {
    const eventBody = JSON.parse(event.body)

    if (!Object.keys(eventBody).includes('spotify_code')) {
        return Response.Error(400, {}, 'No spotify_code provided')
    }

    const { spotify_code } = eventBody

    try {
        const token = await generateJWT(spotify_code)

        return Response.OK({ token })
    } catch (ex) {
        return Response.Unauthorised()
    }
}
