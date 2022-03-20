// Handle Sync Queue Items

const { playlistSync } = require('../lib/PlaylistSync')
const Logger = require('../utils/Logger')

module.exports.handler = async function (event) {
    for (const message of event.Records) {
        const { userId } = JSON.parse(message.body)

        try {
            await playlistSync(userId)
        } catch (ex) {
            Logger.error({
                service: 'sync-queue-handler',
                message: `Failed to process sync for User ${userId}`,
                exception_message: ex.message,
                stack: ex.stack,
                exception: ex,
            })
        }
    }
}
