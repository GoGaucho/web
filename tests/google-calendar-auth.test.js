import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeGoogleCalendar, prepareGoogleCalendar, GOOGLE_CALENDAR_SCOPE, googleCalendarErrorMessage } from '../src/utils/google-calendar-auth.js'

const check = (name, run) => test(name, { timeout: 1500 }, run)
const uid = 'school-source-student'
const clientId = 'test-calendar.apps.googleusercontent.com'
const token = 'unit-test-transient-token'
const tokenResponse = () => ({ access_token: token, scope: `${GOOGLE_CALENDAR_SCOPE} openid email` })
const account = email => ({ sub: 'independent-destination-subject', email, email_verified: true })
const jsonResponse = (body, ok = true) => ({ ok, json: async () => body })
const hasCode = code => error => error.code === `calendar-auth/${code}`
const canceled = error => error.canceled === true && hasCode('canceled')(error)
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }
function deferred () {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
function oauthHarness (t, overrides = {}) {
  const controller = new AbortController()
  t.after(() => controller.abort())
  const h = {
    auth: { currentUser: { uid, email: 'source@ucsb.edu' } }, controller,
    requests: [], scopeChecks: [], fetches: [],
    oauth2: {
      initTokenClient (config) {
        h.config = config
        return { requestAccessToken: options => h.requests.push(options) }
      },
      hasGrantedAllScopes (response, ...scopes) { h.scopeChecks.push({ response, scopes }); return true }
    },
    fetchImpl: async (url, options) => {
      h.fetches.push({ url, ...options })
      return jsonResponse(account('destination@gmail.com'))
    },
    ...overrides
  }
  return h
}
const options = (h, extra = {}) => ({ auth: h.auth, clientId, oauth2: h.oauth2, fetchImpl: h.fetchImpl, signal: h.controller.signal, ...extra })
const authorize = (h, extra = {}) => authorizeGoogleCalendar(uid, options(h, extra))
function loaderHarness () {
  const scripts = [], windowImpl = {}
  const documentImpl = {
    createElement: tag => { assert.equal(tag, 'script'); return { remove () { this.removed = true } } },
    head: { appendChild: script => scripts.push(script) }
  }
  const load = () => prepareGoogleCalendar({ clientId, windowImpl, documentImpl })
  const ready = () => { windowImpl.google = { accounts: { oauth2: { initTokenClient () {} } } } }
  return { scripts, windowImpl, documentImpl, load, ready }
}

check('popup starts synchronously with explicit unrestricted account choice and narrow Calendar access', async t => {
  const h = oauthHarness(t), source = h.auth.currentUser
  const pending = authorize(h)
  assert.equal(h.requests.length, 1, 'Popup must start before awaiting authorization')
  assert.deepEqual(h.requests[0], { prompt: 'select_account' })
  assert.equal(h.config.client_id, clientId)
  assert.equal(h.config.prompt, 'select_account')
  assert.equal(h.config.include_granted_scopes, false)
  assert.deepEqual(h.config.scope.split(' ').sort(), [GOOGLE_CALENDAR_SCOPE, 'openid', 'email'].sort())
  assert.equal('hd' in h.config, false)
  assert.equal('login_hint' in h.config, false)
  const response = tokenResponse()
  h.config.callback(response)
  assert.deepEqual(await pending, { accessToken: token, email: 'destination@gmail.com' })
  assert.deepEqual(h.scopeChecks, [{ response, scopes: [GOOGLE_CALENDAR_SCOPE] }])
  assert.equal(h.auth.currentUser, source)
  assert.equal(h.fetches.length, 1)
  assert.equal(h.fetches[0].url, 'https://openidconnect.googleapis.com/v1/userinfo')
  assert.equal(h.fetches[0].headers.Authorization, `Bearer ${token}`)
  assert.equal(h.fetches[0].url.includes(token), false)
})

check('personal and school destination subjects can differ from the preserved Firebase source identity', async t => {
  for (const email of ['source@ucsb.edu', 'personal@gmail.com']) {
    const h = oauthHarness(t, { fetchImpl: async () => jsonResponse(account(email)) })
    const source = h.auth.currentUser, pending = authorize(h)
    h.config.callback(tokenResponse())
    assert.deepEqual(await pending, { accessToken: token, email })
    assert.equal(h.auth.currentUser, source)
    assert.equal(source.uid, uid)
    assert.notEqual(account(email).sub, uid)
  }
})

check('signed-out, absent and stale source identities reject before opening a popup', async t => {
  for (const [expectedUid, currentUser] of [[undefined, { uid }], ['', { uid }], [uid, null], [uid, { uid: 'another-student' }]]) {
    const h = oauthHarness(t, { auth: { currentUser } })
    await assert.rejects(authorizeGoogleCalendar(expectedUid, options(h)), hasCode('source-changed'))
    assert.equal(h.requests.length, 0)
    assert.equal(h.fetches.length, 0)
  }
})

check('invalid client configuration and unavailable GIS reject without OAuth or HTTP work', async t => {
  for (const invalid of ['', null, 123, 'wrong.apps.example.com', 'https://client.apps.googleusercontent.com']) {
    const h = oauthHarness(t)
    await assert.rejects(authorize(h, { clientId: invalid }), hasCode('configuration'))
    assert.equal(h.requests.length, 0)
  }
  for (const oauth2 of [null, {}, { initTokenClient () {} }]) {
    const h = oauthHarness(t)
    await assert.rejects(authorize(h, { oauth2 }), hasCode('not-ready'))
    assert.equal(h.requests.length, 0)
  }
})

check('source logout or account change during OAuth blocks destination inspection', async t => {
  for (const replacement of [null, { uid: 'other-school-user' }]) {
    const h = oauthHarness(t), pending = authorize(h)
    h.auth.currentUser = replacement
    h.config.callback(tokenResponse())
    await assert.rejects(pending, hasCode('source-changed'))
    assert.equal(h.fetches.length, 0)
  }
})

check('source identity is checked after UserInfo headers and after its asynchronous JSON body', async t => {
  for (const boundary of ['headers', 'body']) {
    const gate = deferred(), started = deferred()
    const h = oauthHarness(t, { fetchImpl: async () => {
      if (boundary === 'headers') { started.resolve(); return gate.promise }
      return { ok: true, json: () => { started.resolve(); return gate.promise } }
    } })
    const pending = authorize(h)
    h.config.callback(tokenResponse())
    await started.promise
    h.auth.currentUser = { uid: 'other-school-user' }
    gate.resolve(boundary === 'headers' ? jsonResponse(account('personal@gmail.com')) : account('personal@gmail.com'))
    await assert.rejects(pending, hasCode('source-changed'))
  }
})

for (const [error, reason] of [['access_denied', 'access-denied'], ['admin_policy_enforced', 'admin-policy'], ['unrecognized_provider_error', 'unknown']]) {
  check(`OAuth ${error} is sanitized with no UserInfo or automatic retry`, async t => {
    const h = oauthHarness(t), pending = authorize(h)
    h.config.callback({ error, error_description: `private diagnostic ${token}` })
    await assert.rejects(pending, failure => hasCode(reason)(failure) && !failure.message.includes(token))
    assert.equal(h.requests.length, 1)
    assert.equal(h.fetches.length, 0)
  })
}

for (const [type, reason] of [['popup_closed', 'popup-closed'], ['popup_failed_to_open', 'popup-blocked'], ['other_popup_error', 'unknown']]) {
  check(`${type} rejects cleanly and releases the operation for another attempt`, async t => {
    const h = oauthHarness(t), pending = authorize(h)
    h.config.error_callback({ type, message: `private diagnostic ${token}` })
    await assert.rejects(pending, hasCode(reason))
    const retry = authorize(h)
    h.config.callback(tokenResponse())
    await retry
    assert.equal(h.requests.length, 2)
  })
}

check('synchronous token-client exceptions are sanitized without retaining the operation lock', async t => {
  for (const boundary of ['initialization', 'request']) {
    const h = oauthHarness(t)
    const oauth2 = { ...h.oauth2, initTokenClient: () => {
      if (boundary === 'initialization') throw new Error(`private initialization ${token}`)
      return { requestAccessToken: () => { throw new Error(`private request ${token}`) } }
    } }
    await assert.rejects(authorize(h, { oauth2 }), failure => hasCode('unknown')(failure) && !failure.message.includes(token))
    const retry = authorize(h)
    h.config.callback(tokenResponse())
    await retry
  }
})

check('missing or malformed tokens and denied Calendar scope stop before UserInfo', async t => {
  for (const value of [null, undefined, {}, { access_token: '' }, { access_token: 123 }]) {
    const h = oauthHarness(t), pending = authorize(h)
    h.config.callback(value)
    await assert.rejects(pending, hasCode('scope-denied'))
    assert.equal(h.fetches.length, 0)
  }
  const h = oauthHarness(t)
  h.oauth2.hasGrantedAllScopes = () => false
  const pending = authorize(h)
  h.config.callback(tokenResponse())
  await assert.rejects(pending, hasCode('scope-denied'))
  assert.equal(h.fetches.length, 0)
})

check('invalid, unverified and missing destination identities cannot authorize calendar writes', async t => {
  for (const body of [null, {}, { ...account('p@gmail.com'), sub: '' }, { ...account('p@gmail.com'), sub: 123 },
    { ...account('p@gmail.com'), email: 123 }, { ...account('p@gmail.com'), email: 'invalid' },
    { ...account('p@gmail.com'), email_verified: false }, { ...account('p@gmail.com'), email_verified: 'true' }]) {
    const h = oauthHarness(t, { fetchImpl: async () => jsonResponse(body) }), pending = authorize(h)
    h.config.callback(tokenResponse())
    await assert.rejects(pending, hasCode('account-details'))
  }
})

check('failed or unparseable UserInfo responses produce a safe account error', async t => {
  for (const result of [jsonResponse({ internal: token }, false), { ok: true, json: async () => { throw new SyntaxError(token) } }]) {
    const h = oauthHarness(t, { fetchImpl: async () => result }), pending = authorize(h)
    h.config.callback(tokenResponse())
    await assert.rejects(pending, failure => hasCode('account-details')(failure) && !failure.message.includes(token))
  }
})

check('UserInfo network failure does not leak diagnostics or retry authorization', async t => {
  const h = oauthHarness(t, { fetchImpl: async () => { throw new TypeError(`private ${token}`) } }), pending = authorize(h)
  h.config.callback(tokenResponse())
  await assert.rejects(pending, failure => hasCode('network')(failure) && !failure.message.includes(token))
  assert.equal(h.requests.length, 1)
})

check('a pending popup blocks duplicate authorization requests', async t => {
  const first = oauthHarness(t), second = oauthHarness(t), pending = authorize(first)
  await assert.rejects(authorize(second), hasCode('busy'))
  assert.equal(second.requests.length, 0)
  first.config.callback(tokenResponse())
  await pending
  const retry = authorize(second)
  second.config.callback(tokenResponse())
  await retry
})

check('prior and popup cancellation reject promptly, ignore late callbacks and release only their operation lock', async t => {
  const prior = oauthHarness(t)
  prior.controller.abort()
  await assert.rejects(authorize(prior), canceled)
  assert.equal(prior.requests.length, 0)
  const h = oauthHarness(t), pending = authorize(h)
  h.controller.abort()
  await assert.rejects(pending, canceled)
  const second = oauthHarness(t), retry = authorize(second)
  h.config.callback(tokenResponse())
  await flush()
  assert.equal(h.fetches.length, 0)
  await assert.rejects(authorize(oauthHarness(t)), hasCode('busy'))
  second.config.callback(tokenResponse())
  await retry
})

check('cancellation immediately rejects during UserInfo headers or JSON even if HTTP ignores abort', async t => {
  for (const boundary of ['headers', 'body']) {
    const gate = deferred(), started = deferred()
    let requestSignal
    const h = oauthHarness(t, { fetchImpl: async (url, options) => {
      requestSignal = options.signal
      if (boundary === 'headers') { started.resolve(); return gate.promise }
      return { ok: true, json: () => { started.resolve(); return gate.promise } }
    } }), pending = authorize(h)
    h.config.callback(tokenResponse())
    await started.promise
    h.controller.abort()
    await assert.rejects(pending, canceled)
    assert.equal(requestSignal.aborted, true)
    const next = oauthHarness(t), retry = authorize(next)
    next.config.callback(tokenResponse())
    await retry
    gate.resolve(boundary === 'headers' ? jsonResponse(account('personal@gmail.com')) : account('personal@gmail.com'))
    await flush()
  }
})

check('a 20-second deadline covers stalled UserInfo fetch and JSON, then aborts its HTTP resources', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  for (const boundary of ['headers', 'body']) {
    const gate = deferred(), started = deferred()
    let requestSignal
    const h = oauthHarness(t, { fetchImpl: async (url, options) => {
      requestSignal = options.signal
      if (boundary === 'headers') { started.resolve(); return gate.promise }
      return { ok: true, json: () => { started.resolve(); return gate.promise } }
    } }), pending = authorize(h)
    h.config.callback(tokenResponse())
    const rejection = assert.rejects(pending, hasCode('network'))
    await started.promise
    t.mock.timers.tick(19999)
    assert.equal(requestSignal.aborted, false)
    t.mock.timers.tick(1)
    await rejection
    assert.equal(requestSignal.aborted, true)
    gate.resolve(boundary === 'headers' ? jsonResponse(account('personal@gmail.com')) : account('personal@gmail.com'))
    await flush()
  }
})

check('temporary authorization does not access browser storage or mutate Firebase destination identity', async t => {
  const originals = new Map()
  for (const key of ['localStorage', 'sessionStorage']) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, get: () => assert.fail('OAuth must not access token storage') })
  }
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const source = Object.freeze({ uid, email: 'source@ucsb.edu' }), auth = Object.freeze({ currentUser: source })
  const h = oauthHarness(t, { auth }), pending = authorize(h)
  h.config.callback(tokenResponse())
  assert.deepEqual(await pending, { accessToken: token, email: 'destination@gmail.com' })
  assert.equal(auth.currentUser, source)
})

check('preparation loads only the static official GIS script and deduplicates per browser window', async () => {
  const h = loaderHarness(), one = h.load(), two = h.load()
  assert.equal(h.scripts.length, 1)
  const script = h.scripts[0]
  assert.equal(script.src, 'https://accounts.google.com/gsi/client')
  assert.equal(script.async, true)
  assert.equal(script.defer, true)
  h.ready()
  script.onload()
  await Promise.all([one, two])
  assert.equal(script.onload, null)
  assert.equal(script.onerror, null)
  assert.equal(script.removed, undefined)
  await h.load()
  assert.equal(h.scripts.length, 1)
})

check('already loaded GIS needs no document and separate browser windows load independently', async () => {
  const h = loaderHarness()
  h.ready()
  await prepareGoogleCalendar({ clientId, windowImpl: h.windowImpl, documentImpl: null })
  assert.equal(h.scripts.length, 0)
  const other = loaderHarness(), pending = other.load()
  assert.equal(other.scripts.length, 1)
  other.ready()
  other.scripts[0].onload()
  await pending
})

check('missing preparation configuration or browser environment appends no script', async () => {
  const h = loaderHarness()
  await assert.rejects(prepareGoogleCalendar({ clientId: '', windowImpl: h.windowImpl, documentImpl: h.documentImpl }), hasCode('configuration'))
  await assert.rejects(prepareGoogleCalendar({ clientId, windowImpl: null, documentImpl: null }), hasCode('not-ready'))
  assert.equal(h.scripts.length, 0)
})

check('script failure removes handlers and permits a new successful preparation attempt', async () => {
  const h = loaderHarness(), pending = h.load(), failed = h.scripts[0]
  failed.onerror()
  await assert.rejects(pending, hasCode('network'))
  assert.equal(failed.removed, true)
  assert.equal(failed.onload, null)
  assert.equal(failed.onerror, null)
  const retry = h.load()
  assert.equal(h.scripts.length, 2)
  h.ready()
  h.scripts[1].onload()
  await retry
})

check('a loaded script without a token client rejects instead of marking GIS ready', async () => {
  const h = loaderHarness(), pending = h.load()
  h.scripts[0].onload()
  await assert.rejects(pending, hasCode('not-ready'))
  assert.equal(h.scripts[0].removed, true)
})

check('GIS preparation times out at 15 seconds and then retries without orphaned handlers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = loaderHarness(), rejection = assert.rejects(h.load(), hasCode('not-ready')), script = h.scripts[0]
  t.mock.timers.tick(14999)
  assert.equal(script.removed, undefined)
  t.mock.timers.tick(1)
  await rejection
  assert.equal(script.removed, true)
  assert.equal(script.onload, null)
  const retry = h.load()
  h.ready()
  h.scripts[1].onload()
  await retry
})

check('DOM setup exceptions are sanitized and do not permanently cache preparation failure', async () => {
  for (const boundary of ['create', 'append']) {
    const h = loaderHarness(), originalCreate = h.documentImpl.createElement, originalAppend = h.documentImpl.head.appendChild
    if (boundary === 'create') h.documentImpl.createElement = () => { throw new Error('private DOM diagnostic') }
    else h.documentImpl.head.appendChild = () => { throw new Error('private DOM diagnostic') }
    await assert.rejects(h.load(), error => hasCode('not-ready')(error) && !error.message.includes('private DOM'))
    h.documentImpl.createElement = originalCreate
    h.documentImpl.head.appendChild = originalAppend
    const retry = h.load()
    h.ready()
    h.scripts[0].onload()
    await retry
  }
})

for (const [code, message] of [
  ['configuration', /not connected/], ['not-ready', /load Google/], ['source-changed', /GoGaucho account changed/],
  ['scope-denied', /Allow GoGaucho/], ['access-denied', /canceled/], ['admin-policy', /personal Google account/],
  ['popup-closed', /canceled/], ['popup-blocked', /Allow pop-ups/], ['network', /Check your connection/],
  ['account-details', /confirm the selected Google account/], ['busy', /Finish the open Google account window/],
  ['canceled', /canceled/], ['unknown', /try again/], ['unexpected-internal-code', /try again/]
]) {
  check(`calendar-auth/${code} maps without exposing provider internals`, async () => {
    const result = googleCalendarErrorMessage({ code: `calendar-auth/${code}`, message: `private OAuth diagnostic ${token}` })
    assert.match(result, message)
    assert.doesNotMatch(result, /private OAuth|unit-test-transient-token|download|\.ics/i)
  })
}

check('non-auth operational errors preserve useful messages and empty errors have a fallback', async () => {
  assert.equal(googleCalendarErrorMessage(new Error('Google denied calendar access.')), 'Google denied calendar access.')
  assert.equal(googleCalendarErrorMessage({}), 'Could not add your calendar. Please try again.')
})
