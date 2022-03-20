// Cloudwatch Event that Creates Queue Events to Sync Active Accounts

const { getAllSyncActiveUsers } = require('../lib/DataAccess')
const Logger = require('../utils/Logger')
const { createSyncQueueItem } = require('../utils/SQS')

module.exports.handler = async function () {
    // Get all Active Sync Accounts
    const users = await getAllSyncActiveUsers()

    const userIds = users.map((user) => user.id)

    for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i]

        try {
            await createSyncQueueItem(userId)
        } catch (ex) {
            Logger.error({
                service: 'auto-playlist-sync-handler',
                message: `Failed to send SQS Message for User ${userId}`,
                exception: ex,
            })
        }
    }
}
