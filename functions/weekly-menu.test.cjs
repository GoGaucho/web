const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseWeeklyMenu, weeklyMenuHandler } = require('./weekly-menu.cjs')

test('keeps empty dates aligned and decodes menu text without copying scripts', () => {
  const days = parseWeeklyMenu(`<script>throw Error('untrusted')</script>
    <div id="lunch-body"><table>
      <thead><tr><th><h4>Sat 12/31</h4></th><th><h4>Sun 1/1</h4></th></tr></thead>
      <tbody><tr><td class="course-row" colspan="2"><h4>Grill</h4></td></tr>
        <tr><td></td><td><dl><dd>Mac &amp; Cheese (v)</dd></dl></td></tr>
        <tr><td class="course-row" colspan="2">Bakery</td></tr>
        <tr><td><dd>Roll</dd></td><td><dd>Cookie</dd></td></tr>
      </tbody></table></div>`)
  assert.deepEqual(days, [
    { date: 'Sat 12/31', meals: { lunch: { Bakery: ['Roll'] } } },
    { date: 'Sun 1/1', meals: { lunch: { Grill: ['Mac & Cheese (v)'], Bakery: ['Cookie'] } } }
  ])
})

test('rejects an unexpected source page instead of returning a misleading empty menu', () => {
  assert.throws(() => parseWeeklyMenu('<html>Service unavailable</html>'), /Unrecognized/)
})

function response() {
  return { headers: {}, setHeader(name, value) { this.headers[name] = value }, end(body) { this.body = JSON.parse(body) } }
}

test('rejects unknown halls before requesting the external source', async () => {
  const res = response()
  await weeklyMenuHandler({ method: 'GET', url: '/?dc=unknown' }, res)
  assert.equal(res.statusCode, 400)
})

test('rejects mutations', async () => {
  const res = response()
  await weeklyMenuHandler({ method: 'POST', url: '/' }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.Allow, 'GET')
})
