// Check JWT Header against DB Accounts
// Allows Access to other Handlers

const { validateJWT } = require('../lib/Authentication')
const Logger = require('../utils/Logger')

module.exports.handler = async (event) => {
    const notAuthorisedPayload = {
        isAuthorized: false,
        context: {
            user_id: null,
        },
    }

    if (!Object.keys(event.headers).includes('authorization')) {
        Logger.info({
            service: 'api-authoriser-handler',
            message: 'Request does not include Authorization Header',
            event,
        })

        return notAuthorisedPayload
    }

    const authorisationHeader = event.headers.authorization.replace(
        'Bearer ',
        '',
    )

    if (authorisationHeader.length === 0) {
        Logger.info({
            service: 'api-authoriser-handler',
            message: 'Authorization Header is empty',
            event,
        })

        return notAuthorisedPayload
    }

    let user

    try {
        user = await validateJWT(authorisationHeader)
    } catch (ex) {
        Logger.info({
            service: 'api-authoriser-handler',
            message: 'Failed to Authorise JWT',
            event,
        })

        return notAuthorisedPayload
    }

    if (!user) {
        Logger.info({
            service: 'api-authoriser-handler',
            message: 'User not found',
            event,
        })

        return notAuthorisedPayload
    }

    return {
        isAuthorized: true,
        context: {
            user_id: user.id,
        },
    }
}
