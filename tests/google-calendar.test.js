import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleCalendar, googleCalendarUrl } from '../src/utils/google-calendar.js'

const API = 'https://www.googleapis.com/calendar/v3'
const name = 'UCSB Schedule Calendar Fall 2026'
const accessToken = 'test-only-access-token'
const calendarId = 'new+calendar/student@ucsb.edu?copy=1#课程'
const calendarPath = `/calendars/${encodeURIComponent(calendarId)}`
const event = (summary = '课程 🦝') => ({
  summary, location: 'Library, north; room\\2', description: 'Study',
  start: { dateTime: '2026-10-26T09:00:00', timeZone: 'America/Los_Angeles' },
  end: { dateTime: '2026-10-26T10:00:00', timeZone: 'America/Los_Angeles' },
  recurrence: ['RRULE:FREQ=WEEKLY;UNTIL=20261110T075959Z'], visibility: 'private'
})
const response = (status, data = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => data })
const created = () => response(200, { id: calendarId })
const inserted = () => response(200, { id: 'event-id' })
const removed = () => response(204)
function deferred () {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
function http (steps) {
  const calls = []
  return {
    calls,
    fetchImpl: async (url, options) => {
      const index = calls.length
      calls.push({ url, ...options })
      assert.ok(index < steps.length, `Unexpected request: ${options.method} ${url}`)
      const step = steps[index]
      if (step instanceof Error) throw step
      return typeof step === 'function' ? await step({ url, ...options }) : step
    }
  }
}
const add = (mock, extra = {}) => createGoogleCalendar({ accessToken, name, events: [event()], fetchImpl: mock.fetchImpl, ...extra })
const paths = mock => mock.calls.map(call => [call.method, call.url.slice(API.length)])

test('creates one separate calendar then inserts exact private Unicode events in order', async () => {
  const mock = http([created(), inserted(), inserted()])
  const events = [event(), event('Math section')]
  const progress = []
  const result = await add(mock, { events, onProgress: (...args) => progress.push(args) })
  assert.deepEqual(result, { calendarId, name })
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['POST', `${calendarPath}/events`], ['POST', `${calendarPath}/events`]])
  const body = JSON.parse(mock.calls[0].body)
  assert.equal(body.summary, name)
  assert.equal(body.timeZone, 'America/Los_Angeles')
  assert.match(body.description, /editable/)
  assert.match(body.description, /do not sync/)
  assert.match(body.description, /enrollment/)
  assert.doesNotMatch(body.description, /GoGaucho|Added by|Exported from/i)
  assert.deepEqual(mock.calls.slice(1).map(call => JSON.parse(call.body)), events)
  assert.deepEqual(progress, [[0, 2], [1, 2], [2, 2]])
  for (const call of mock.calls) {
    assert.equal(call.headers.Authorization, `Bearer ${accessToken}`)
    assert.equal(call.headers['Content-Type'], 'application/json')
    assert.equal(call.url.includes(accessToken), false)
    assert.equal(call.body.includes(accessToken), false)
    assert.ok(call.signal instanceof AbortSignal)
  }
})

test('event requests stay sequential and progress advances only after confirmed responses', async () => {
  const firstInsert = deferred(), firstStarted = deferred()
  const mock = http([created(), () => { firstStarted.resolve(); return firstInsert.promise }, inserted()])
  const progress = []
  const pending = add(mock, { events: [event('First'), event('Second')], onProgress: (...args) => progress.push(args) })
  await firstStarted.promise
  assert.equal(mock.calls.length, 2)
  assert.deepEqual(progress, [[0, 2]])
  firstInsert.resolve(inserted())
  await pending
  assert.deepEqual(progress, [[0, 2], [1, 2], [2, 2]])
})

test('missing token, empty events and prior cancellation perform no network requests', async () => {
  const mock = http([])
  for (const token of ['', undefined, null]) {
    await assert.rejects(add(mock, { accessToken: token }), /access was not granted/)
  }
  for (const events of [[], undefined, null]) {
    await assert.rejects(add(mock, { events }), /no scheduled classes/)
  }
  await assert.rejects(add(mock, { isCurrent: () => false }), error => error.canceled === true)
  assert.equal(mock.calls.length, 0)
})

for (const [label, status, data, message] of [
  ['expired access', 401, {}, /access expired/],
  ['permission denial', 403, {}, /denied calendar access/],
  ['disabled API', 403, { error: { errors: [{ reason: 'accessNotConfigured' }] } }, /not connected to GoGaucho/],
  ['disabled service', 403, { error: { errors: [{ reason: 'serviceDisabled' }] } }, /not connected to GoGaucho/],
  ['disabled API detail', 403, { error: { details: [{ reason: 'SERVICE_DISABLED' }] } }, /not connected to GoGaucho/],
  ['quota status', 429, {}, /Calendar is busy/],
  ['quota reason', 403, { error: { errors: [{ reason: 'rateLimitExceeded' }] } }, /Calendar is busy/],
  ['per-user quota', 403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } }, /Calendar is busy/],
  ['invalid API request', 400, { error: { message: 'Internal server details' } }, /could not complete/],
  ['unconfirmed create server error', 500, { error: { message: 'Internal server details' } }, /Check Google Calendar/]
]) {
  test(`${label} is actionable and does not retry or delete an unknown calendar`, async () => {
    const mock = http([response(status, data)])
    await assert.rejects(add(mock), error => {
      assert.match(error.message, message)
      assert.doesNotMatch(error.message, /Internal server details/)
      if (status >= 500) assert.equal(error.uncertain, true)
      return true
    })
    assert.deepEqual(paths(mock), [['POST', '/calendars']])
  })
}

test('unparseable create server error response still reports a useful orphan-check warning', async () => {
  const mock = http([{ status: 500, ok: false, json: async () => { throw new SyntaxError('HTML body') } }])
  await assert.rejects(add(mock), error => error.uncertain === true && /Check Google Calendar/.test(error.message))
  assert.equal(mock.calls.length, 1)
})

test('missing create response ID marks uncertainty without guessing a calendar to delete', async () => {
  for (const data of [{}, null, { id: 42 }, { id: { unexpected: 'object' } }]) {
    const mock = http([response(200, data)])
    await assert.rejects(add(mock), error => {
      assert.equal(error.uncertain, true)
      assert.match(error.message, /Check Google Calendar/)
      assert.ok(error.message.includes(name))
      return true
    })
    assert.equal(mock.calls.length, 1)
  }
})

test('network uncertainty during create warns to check the named calendar with no automatic retry', async () => {
  const mock = http([new TypeError('Failed to fetch')])
  await assert.rejects(add(mock), error => {
    assert.equal(error.uncertain, true)
    assert.match(error.message, /Check Google Calendar/)
    assert.ok(error.message.includes(name))
    return true
  })
  assert.equal(mock.calls.length, 1)
})

test('failed event insertion rolls back only the exact new calendar and stops subsequent inserts', async () => {
  const mock = http([created(), inserted(), response(403), removed()])
  const progress = []
  await assert.rejects(add(mock, { events: [event('First'), event('Second'), event('Third')], onProgress: (...args) => progress.push(args) }), error => {
    assert.match(error.message, /denied calendar access/)
    assert.equal(error.uncertain, false)
    return true
  })
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['POST', `${calendarPath}/events`], ['POST', `${calendarPath}/events`], ['DELETE', calendarPath]])
  assert.equal(mock.calls.at(-1).body, undefined)
  assert.deepEqual(progress, [[0, 3], [1, 3]])
})

test('network failure after known creation cleans up and clears the orphan uncertainty', async () => {
  const mock = http([created(), new TypeError('Offline'), removed()])
  await assert.rejects(add(mock), error => error.uncertain === false)
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['POST', `${calendarPath}/events`], ['DELETE', calendarPath]])
})

test('cleanup failure preserves exact new calendar identity and manual removal guidance', async () => {
  const mock = http([created(), response(401), response(403)])
  await assert.rejects(add(mock), error => {
    assert.equal(error.partial, true)
    assert.equal(error.calendarId, calendarId)
    assert.ok(error.message.includes(name))
    assert.match(error.message, /delete that calendar before trying again/)
    assert.doesNotMatch(error.message, new RegExp(accessToken))
    return true
  })
  assert.equal(mock.calls.length, 3)
})

test('canceling during create waits for its ID before cleanup and never inserts events', async () => {
  let current = true
  const creation = deferred(), started = deferred()
  const mock = http([() => { started.resolve(); return creation.promise }, removed()])
  const pending = add(mock, { isCurrent: () => current })
  await started.promise
  current = false
  assert.equal(mock.calls[0].signal.aborted, false)
  creation.resolve(created())
  await assert.rejects(pending, error => error.canceled === true)
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['DELETE', calendarPath]])
})

test('canceling while the create response body is read still preserves its ID for cleanup', async () => {
  let current = true
  const body = deferred(), started = deferred()
  const mock = http([{
    status: 200, ok: true,
    json: async () => { started.resolve(); return body.promise }
  }, removed()])
  const pending = add(mock, { isCurrent: () => current })
  await started.promise
  current = false
  body.resolve({ id: calendarId })
  await assert.rejects(pending, error => error.canceled === true)
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['DELETE', calendarPath]])
})

test('canceling after creation before the first event rolls back the created calendar', async () => {
  let current = true
  const mock = http([created(), removed()])
  const progress = []
  await assert.rejects(add(mock, {
    isCurrent: () => current,
    onProgress: (...args) => { progress.push(args); current = false }
  }), error => error.canceled === true)
  assert.deepEqual(progress, [[0, 1]])
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['DELETE', calendarPath]])
})

test('canceling between confirmed inserts prevents the next insert and rolls back', async () => {
  let current = true
  const mock = http([created(), inserted(), removed()])
  await assert.rejects(add(mock, {
    events: [event('First'), event('Second')], isCurrent: () => current,
    onProgress: count => { if (count === 1) current = false }
  }), error => error.canceled === true)
  assert.deepEqual(paths(mock), [['POST', '/calendars'], ['POST', `${calendarPath}/events`], ['DELETE', calendarPath]])
})

test('canceling during the last write still rolls back instead of reporting success', async () => {
  let current = true
  const finalInsert = deferred(), started = deferred()
  const mock = http([created(), () => { started.resolve(); return finalInsert.promise }, removed()])
  const progress = []
  const pending = add(mock, { isCurrent: () => current, onProgress: (...args) => progress.push(args) })
  await started.promise
  current = false
  finalInsert.resolve(inserted())
  await assert.rejects(pending, error => error.canceled === true)
  assert.deepEqual(progress, [[0, 1]])
  assert.equal(mock.calls.at(-1).method, 'DELETE')
})

test('each operation cleans up its own new calendar without touching concurrent successful calendars', async () => {
  const failed = http([response(200, { id: 'failed-copy' }), response(500), removed()])
  const success = http([response(200, { id: 'successful-copy' }), inserted()])
  const outcomes = await Promise.allSettled([add(failed), add(success)])
  assert.equal(outcomes[0].status, 'rejected')
  assert.equal(outcomes[1].status, 'fulfilled')
  assert.equal(outcomes[1].value.calendarId, 'successful-copy')
  assert.deepEqual(paths(failed).at(-1), ['DELETE', '/calendars/failed-copy'])
  assert.equal(success.calls.some(call => call.method === 'DELETE'), false)
})

test('a stalled create aborts after 20 seconds and reports an uncertain calendar', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let signal
  const mock = http([request => new Promise((resolve, reject) => {
    signal = request.signal
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })])
  const rejection = assert.rejects(add(mock), error => error.uncertain === true)
  t.mock.timers.tick(19999)
  assert.equal(signal.aborted, false)
  t.mock.timers.tick(1)
  assert.equal(signal.aborted, true)
  await rejection
  assert.equal(mock.calls.length, 1)
})

test('a stalled event write gets its own 20-second timeout then cleans up the known calendar', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const started = deferred()
  let signal
  const mock = http([created(), request => new Promise((resolve, reject) => {
    signal = request.signal
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    started.resolve()
  }), removed()])
  const rejection = assert.rejects(add(mock), error => {
    assert.equal(error.uncertain, false)
    return true
  })
  await started.promise
  t.mock.timers.tick(19999)
  assert.equal(signal.aborted, false)
  t.mock.timers.tick(1)
  await rejection
  assert.equal(signal.aborted, true)
  assert.equal(mock.calls[0].signal.aborted, false)
  assert.deepEqual(paths(mock).at(-1), ['DELETE', calendarPath])
})

test('a stalled cleanup reports a partial calendar with its exact ID', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const started = deferred()
  const mock = http([created(), response(403), request => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    started.resolve()
  })])
  const rejection = assert.rejects(add(mock), error => error.partial === true && error.calendarId === calendarId)
  await started.promise
  t.mock.timers.tick(20000)
  await rejection
  assert.equal(mock.calls.length, 3)
})

test('completed requests clear their timeouts and use independent abort signals', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const mock = http([created(), inserted()])
  await add(mock)
  assert.notEqual(mock.calls[0].signal, mock.calls[1].signal)
  t.mock.timers.tick(40000)
  assert.ok(mock.calls.every(call => !call.signal.aborted))
})

test('success link selects the created calendar in the same school account with encoded identifiers', () => {
  const url = new URL(googleCalendarUrl(calendarId, 'student+test@ucsb.edu'))
  assert.equal(url.origin, 'https://calendar.google.com')
  assert.equal(url.pathname, '/calendar/r')
  assert.equal(url.searchParams.get('cid'), calendarId)
  assert.equal(url.searchParams.get('authuser'), 'student+test@ucsb.edu')
  assert.equal(new URL(googleCalendarUrl(calendarId)).searchParams.has('authuser'), false)
})
