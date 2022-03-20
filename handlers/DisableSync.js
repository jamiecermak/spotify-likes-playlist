// Remove managed playlist
// Disable syncing

// Create Managed Playlist and enable syncing

const { getUser, disableSyncForUser } = require('../lib/DataAccess')
const Logger = require('../utils/Logger')
const { Response } = require('../utils/Response')

module.exports.handler = async function (event, context) {
    const userId = '' // TODO

    try {
        const user = await getUser(userId)

        if (!user.sync_active) {
            return Response.Error(500, {}, 'Sync is already disabled.')
        }

        await disableSyncForUser(userId)

        return Response.OK()
    } catch (ex) {
        Logger.error({
            service: 'auto-playlist-sync-handler',
            message: `Failed to disable Sync for User ${userId}`,
            exception: ex,
        })

        return Response.Error(
            500,
            {},
            'Failed to disable syncing. Try again later.',
        )
    }
}
