// Push a Sync Queue Item for the Authorised Account

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs')
const Logger = require('../utils/Logger')
const { Response } = require('../utils/Response')

const sqsClient = new SQSClient({
    apiVersion: 'latest',
    region: process.env.AWS_REGION,
})

module.exports.handler = async function (event, context) {
    const userId = '' // TODO

    try {
        const command = new SendMessageCommand({
            QueueUrl: process.env.SLP_SYNC_QUEUE_URL,
            MessageBody: JSON.stringify({ userId }),
        })

        await sqsClient.send(command)

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
