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

    if (!Object.keys(event.headers).includes('Authorization')) {
        return notAuthorisedPayload
    }

    const authorisationHeader = event.headers.Authorization.replace(
        'Bearer ',
        '',
    )

    if (authorisationHeader.length === 0) {
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
