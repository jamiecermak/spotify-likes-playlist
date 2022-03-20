// Push a Sync Queue Item for the Authorised Account

const Logger = require('../utils/Logger')
const { Response } = require('../utils/Response')
const { createSyncQueueItem } = require('../utils/SQS')

module.exports.handler = async function (event) {
    const userId = event.requestContext.authorizer.lambda.user_id

    try {
        await createSyncQueueItem(userId)

        return Response.OK({}, 'Syncing has started.')
    } catch (ex) {
        Logger.error({
            service: 'auto-playlist-sync-handler',
            message: `Failed to send SQS Message for User ${userId}`,
            exception: ex,
        })

        return Response.Error(
            500,
            {},
            'Failed to Sync Playlists. Try again later.',
        )
    }
}
