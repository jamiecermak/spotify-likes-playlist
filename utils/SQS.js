const {
    SQSClient,
    SendMessageCommand,
    GetQueueUrlCommand,
} = require('@aws-sdk/client-sqs')
const { SLP_SYNC_QUEUE_NAME } = require('./Environment')

const sqsClient = new SQSClient({
    apiVersion: 'latest',
    region: process.env.AWS_REGION,
})

function getQueueUrlFromName(QueueName) {
    const command = new GetQueueUrlCommand({
        QueueName,
    })

    return sqsClient.send(command)
}

async function createSyncQueueItem(userId) {
    const QueueUrl = await getQueueUrlFromName(SLP_SYNC_QUEUE_NAME)

    const command = new SendMessageCommand({
        QueueUrl,
        MessageBody: JSON.stringify({ userId }),
    })

    return sqsClient.send(command)
}

module.exports = { createSyncQueueItem }
