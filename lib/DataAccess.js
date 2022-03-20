const User = require('../models/User')
const { SpotifyAuthAPI } = require('./SpotifyAuthAPI')

async function createNewUser(
    id,
    display_name,
    access_token,
    refresh_token,
    expires_in,
) {
    await User.create({
        id,
        display_name,
        access_token,
        refresh_token,
        expires_at: SpotifyAuthAPI.calculateExpiresAt(expires_in).toISOString(),
        sync_active: false,
    })

    return id
}

function updateUserCredentials(id, access_token, refresh_token, expires_in) {
    return User.update(
        { id },
        {
            access_token,
            refresh_token,
            expires_at:
                SpotifyAuthAPI.calculateExpiresAt(expires_in).toISOString(),
        },
    )
}

function getUser(userId) {
    return User.get({ id: userId })
}

function setSyncActiveForUser(id, managed_playlist_id) {
    return User.update(
        { id },
        {
            managed_playlist_id,
            sync_active: true,
        },
    )
}

function disableSyncForUser(id) {
    return User.update(
        { id },
        {
            $SET: {
                sync_active: false,
            },
            $REMOVE: ['managed_playlist_id'],
        },
    )
}

function getAllSyncActiveUsers() {
    return User.query('sync_active').eq(true).exec()
}

function setLastSyncForUser(id) {
    return User.update(
        { id },
        {
            last_sync: new Date().toISOString(),
        },
    )
}

function deleteUser(id) {
    return User.delete({ id })
}

module.exports = {
    createNewUser,
    updateUserCredentials,
    getUser,
    setSyncActiveForUser,
    getAllSyncActiveUsers,
    setLastSyncForUser,
    deleteUser,
    disableSyncForUser,
}
