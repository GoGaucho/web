const API = 'https://www.googleapis.com/calendar/v3'

function apiError (status, data) {
  const reasons = [
    ...(data?.error?.errors || []).map(error => error.reason),
    ...(data?.error?.details || []).map(error => error.reason)
  ]
  if (reasons.some(reason => ['accessNotConfigured', 'serviceDisabled', 'SERVICE_DISABLED'].includes(reason))) {
    return new Error('Google Calendar is not connected to GoGaucho yet. Please try again later.')
  }
  if (status === 401) return new Error('Google Calendar access expired. Try again to reconnect your account.')
  if (status === 429 || reasons.some(reason => ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason))) {
    return new Error('Google Calendar is busy. Please try again later.')
  }
  if (status === 403) return new Error('Google denied calendar access. Try again and allow the requested calendar permission.')
  return new Error('Google Calendar could not complete this request. Please try again.')
}

export function googleCalendarUrl (calendarId, email) {
  const url = new URL('https://calendar.google.com/calendar/r')
  url.searchParams.set('cid', calendarId)
  if (email) url.searchParams.set('authuser', email)
  return url.href
}

export async function createGoogleCalendar ({ accessToken, name, events, isCurrent = () => true, onProgress = () => {}, fetchImpl = fetch }) {
  if (!accessToken) throw new Error('Google Calendar access was not granted. Please try again.')
  if (!events?.length) throw new Error('There are no scheduled classes to add.')
  let calendarId = ''

  async function request (path, method, body) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetchImpl(API + path, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal
      })
      const data = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        if (path === '/calendars' && method === 'POST' && response.status >= 500) {
          throw Object.assign(new Error(`Google did not confirm whether “${name}” was created. Check Google Calendar before trying again.`), { uncertain: true })
        }
        throw apiError(response.status, data)
      }
      return data
    } catch (error) {
      if (error instanceof TypeError || error.name === 'AbortError') {
        throw Object.assign(new Error(`Google did not confirm the request. Check Google Calendar for “${name}” before trying again.`), { uncertain: true })
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  function checkCurrent () {
    if (!isCurrent()) throw Object.assign(new Error('Calendar addition canceled.'), { canceled: true })
  }

  try {
    checkCurrent()
    const calendar = await request('/calendars', 'POST', {
      summary: name,
      description: 'Your editable UCSB schedule. Changes do not sync back or update your enrollment.',
      timeZone: 'America/Los_Angeles'
    })
    calendarId = typeof calendar?.id === 'string' ? calendar.id : ''
    if (!calendarId) throw Object.assign(new Error(`Google did not return the new calendar details. Check Google Calendar for “${name}” before trying again.`), { uncertain: true })
    checkCurrent()
    onProgress(0, events.length)
    for (const [index, event] of events.entries()) {
      checkCurrent()
      await request(`/calendars/${encodeURIComponent(calendarId)}/events`, 'POST', event)
      checkCurrent()
      onProgress(index + 1, events.length)
    }
    return { calendarId, name }
  } catch (error) {
    if (calendarId) {
      try {
        // Cleanup applies only to the calendar created by this operation.
        await request(`/calendars/${encodeURIComponent(calendarId)}`, 'DELETE')
      } catch {
        throw Object.assign(new Error(`The addition did not finish, and “${name}” could not be removed. Open Google Calendar and delete that calendar before trying again.`), { calendarId, partial: true })
      }
      error.uncertain = false
    }
    throw error
  }
}
