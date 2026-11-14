const { onRequest } = require('firebase-functions/v2/https')
const { weeklyMenuHandler } = require('./weekly-menu.cjs')

exports.weeklyDiningMenu = onRequest({ region: 'us-central1', timeoutSeconds: 30, maxInstances: 5 }, weeklyMenuHandler)
