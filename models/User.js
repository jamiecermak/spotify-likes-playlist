const dynamoose = require('dynamoose')
const { SLP_USERS_TABLE_NAME } = require('../utils/Environment')

module.exports = dynamoose.model(
    SLP_USERS_TABLE_NAME,
    new dynamoose.Schema(
        {
            id: String,
            display_name: String,
            access_token: String,
            refresh_token: String,
            expires_at: String,
            sync_active: Boolean,
            last_sync: String,
            managed_playlist_id: String,
        },
        {
            timestamps: {
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            },
        },
    ),
)
