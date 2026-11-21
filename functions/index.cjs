const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { weeklyMenuHandler } = require('./weekly-menu.cjs')

exports.weeklyDiningMenu = onRequest({ region: 'us-central1', timeoutSeconds: 30, maxInstances: 5 }, weeklyMenuHandler)

const ucsbApiKey = defineSecret('UCSB_API_KEY')

exports.courseFinal = onCall({ region: 'us-central1', secrets: [ucsbApiKey], maxInstances: 5 }, async ({ data }) => {
  const { quarter, enrollCode } = data ?? {}
  if (typeof quarter !== 'string' || !/^\d{4}[1-4]$/.test(quarter) ||
      typeof enrollCode !== 'string' || !/^\d{5}$/.test(enrollCode)) {
    throw new HttpsError('invalid-argument', 'A valid quarter and enrollment code are required.')
  }

  try {
    const query = new URLSearchParams({ quarter, enrollCode })
    const response = await fetch(`https://api.ucsb.edu/academics/curriculums/v3/finals?${query}`, {
      headers: { 'ucsb-api-key': ucsbApiKey.value() },
      signal: AbortSignal.timeout(8000),
    })
    if (response.ok) {
      const { hasFinals, examDate, beginTime, endTime, comments } = await response.json()
      if (typeof hasFinals === 'boolean') {
        return { hasFinals, examDate, beginTime, endTime, comments }
      }
    }
  } catch (error) {
    console.warn('Course final lookup failed', error.name)
  }
  throw new HttpsError('unavailable', 'Final exam information is temporarily unavailable.')
})
