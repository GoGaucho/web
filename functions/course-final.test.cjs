const assert = require('node:assert/strict')
const test = require('node:test')
const { courseFinal } = require('./index.cjs')

test('preserves leading zeros and distinguishes missing exams from lookup failures', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(new URL(url).search, '?quarter=20271&enrollCode=08144')
    return Response.json({ hasFinals: false })
  })
  const request = { data: { quarter: '20271', enrollCode: '08144' } }

  await assert.rejects(courseFinal.run({ data: { ...request.data, enrollCode: '8144' } }),
    { code: 'invalid-argument' })
  assert.equal(globalThis.fetch.mock.callCount(), 0)
  assert.equal((await courseFinal.run(request)).hasFinals, false)
  assert.equal(globalThis.fetch.mock.callCount(), 1)

  globalThis.fetch.mock.mockImplementation(async () => new Response(null, { status: 503 }))
  await assert.rejects(courseFinal.run(request), { code: 'unavailable' })
})
