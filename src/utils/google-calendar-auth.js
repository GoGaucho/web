import { getAuth } from 'firebase/auth'

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'
// Public Web OAuth client, with GoGaucho and localhost:3000 origins configured.
const CLIENT_ID = import.meta.env?.VITE_GOOGLE_CALENDAR_CLIENT_ID || '1083649636208-smr7a1d16cl4bl9ufmn0otn8b1pnk4jc.apps.googleusercontent.com'
const scriptLoads = new WeakMap()
let activeAuthorization = null

const messages = {
  configuration: 'Google Calendar is not connected for this website yet. Please try again later.',
  'not-ready': 'Could not load Google. Try connecting again.',
  'source-changed': 'Your GoGaucho account changed. Sign in with your school account and try again.',
  'scope-denied': 'Allow GoGaucho to create your schedule calendar, then try again.',
  'access-denied': 'Google connection canceled. Your calendar has not been added.',
  'admin-policy': 'This Google account’s administrator blocked calendar access. Try a personal Google account.',
  'popup-closed': 'Google connection canceled. Your calendar has not been added.',
  'popup-blocked': 'Allow pop-ups for GoGaucho, then try again.',
  network: 'Could not connect to Google. Check your connection and try again.',
  'account-details': 'Could not confirm the selected Google account. Please connect again.',
  busy: 'Finish the open Google account window before trying again.',
  canceled: 'Calendar addition canceled.',
  unknown: 'Could not connect your Google account. Please try again.'
}

function authError (reason) {
  return Object.assign(new Error(messages[reason] || messages.unknown), {
    code: 'calendar-auth/' + reason,
    ...(reason === 'canceled' ? { canceled: true } : {})
  })
}

function checkClientId (clientId) {
  if (typeof clientId !== 'string' || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw authError('configuration')
}

function abortable (promise, signal) {
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => reject(authError('canceled'))
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
    if (signal.aborted) abort()
  })
}

export async function prepareGoogleCalendar ({ clientId = CLIENT_ID, windowImpl = globalThis.window, documentImpl = globalThis.document } = {}) {
  checkClientId(clientId)
  if (windowImpl?.google?.accounts?.oauth2?.initTokenClient) return
  if (!windowImpl || !documentImpl) throw authError('not-ready')
  if (!scriptLoads.has(windowImpl)) {
    const pending = new Promise((resolve, reject) => {
      let script, timeout, finished = false
      const finish = error => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        if (script) {
          script.onload = null
          script.onerror = null
        }
        if (error) {
          script?.remove()
          reject(error)
        } else resolve()
      }
      try {
        script = documentImpl.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        timeout = setTimeout(() => finish(authError('not-ready')), 15000)
        script.onload = () => finish(windowImpl.google?.accounts?.oauth2?.initTokenClient ? null : authError('not-ready'))
        script.onerror = () => finish(authError('network'))
        documentImpl.head.appendChild(script)
      } catch {
        finish(authError('not-ready'))
      }
    })
    scriptLoads.set(windowImpl, pending)
    pending.catch(() => {
      if (scriptLoads.get(windowImpl) === pending) scriptLoads.delete(windowImpl)
    })
  }
  await scriptLoads.get(windowImpl)
}

export async function authorizeGoogleCalendar (expectedUid, {
  auth = getAuth(), clientId = CLIENT_ID,
  oauth2 = globalThis.window?.google?.accounts?.oauth2, fetchImpl = fetch, signal
} = {}) {
  const checkSource = () => {
    if (signal?.aborted) throw authError('canceled')
    if (!expectedUid || auth.currentUser?.uid !== expectedUid) throw authError('source-changed')
  }
  checkSource()
  checkClientId(clientId)
  if (!oauth2?.initTokenClient || !oauth2?.hasGrantedAllScopes) throw authError('not-ready')
  if (activeAuthorization) throw authError('busy')
  const operation = Symbol()
  activeAuthorization = operation
  try {
    // Preload separately so this popup starts synchronously in the submit gesture.
    const response = await abortable(new Promise((resolve, reject) => {
      let settled = false
      const settle = (error, value) => {
        if (settled) return
        settled = true
        if (error) reject(error)
        else resolve(value)
      }
      try {
        const client = oauth2.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_CALENDAR_SCOPE + ' openid email',
          include_granted_scopes: false,
          prompt: 'select_account',
          callback: value => {
            if (value?.error) {
              settle(authError(value.error === 'access_denied' ? 'access-denied' : value.error === 'admin_policy_enforced' ? 'admin-policy' : 'unknown'))
            } else settle(null, value)
          },
          error_callback: error => settle(authError(error?.type === 'popup_closed' ? 'popup-closed' : error?.type === 'popup_failed_to_open' ? 'popup-blocked' : 'unknown'))
        })
        client.requestAccessToken({ prompt: 'select_account' })
      } catch {
        settle(authError('unknown'))
      }
    }), signal)
    checkSource()
    if (typeof response?.access_token !== 'string' || !response.access_token || !oauth2.hasGrantedAllScopes(response, GOOGLE_CALENDAR_SCOPE)) {
      throw authError('scope-denied')
    }

    const controller = new AbortController()
    let timeout
    try {
      const readAccount = async () => {
        let result
        try {
          result = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` }, signal: controller.signal
          })
        } catch {
          throw authError('network')
        }
        checkSource()
        if (!result.ok) throw authError('account-details')
        const account = await result.json().catch(() => null)
        checkSource()
        if (typeof account?.sub !== 'string' || !account.sub || typeof account.email !== 'string' || !account.email.includes('@') || account.email_verified !== true) {
          throw authError('account-details')
        }
        return account
      }
      const deadline = new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort()
          reject(authError('network'))
        }, 20000)
      })
      const account = await abortable(Promise.race([readAccount(), deadline]), signal)
      checkSource()
      return { accessToken: response.access_token, email: account.email }
    } finally {
      clearTimeout(timeout)
      controller.abort()
    }
  } finally {
    if (activeAuthorization === operation) activeAuthorization = null
  }
}

export function googleCalendarErrorMessage (error) {
  if (error.code?.startsWith('calendar-auth/')) return messages[error.code.slice('calendar-auth/'.length)] || messages.unknown
  return error.message || 'Could not add your calendar. Please try again.'
}
