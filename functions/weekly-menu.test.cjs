const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseWeeklyMenu, parseMealHours, weeklyMenuHandler } = require('./weekly-menu.cjs')

test('reads per-date hours only from the requested hall', () => {
  const html = `<div id="carrillo-body">
    <h5>Breakfast <small>7:15 AM - 10:00 AM</small></h5>
    <h5>Lunch <small>11:00 AM - 3:00 PM</small></h5>
    <h5>Late Night <small>9:00 PM - 11:00 PM</small></h5>
  </div><div id="portola-body"><h5>Lunch <small>Different hours</small></h5></div>`
  assert.deepEqual(parseMealHours(html, 'carrillo'), {
    breakfast: '7:15 AM - 10:00 AM', lunch: '11:00 AM - 3:00 PM', 'late-night': '9:00 PM - 11:00 PM'
  })
  assert.deepEqual(parseMealHours('<html>Unavailable</html>', 'carrillo'), {})
})

test('uses UCSB date identifiers across year boundaries', () => {
  const ticks = (BigInt(Date.UTC(2027, 0, 1)) + 62135596800000n) * 10000n
  const days = parseWeeklyMenu(`<div id="lunch-body"><table><thead><tr>
    <th><h4>Fri 1/1</h4><h6 id="${ticks}-carrillo-lunch-Hours"></h6></th>
    </tr></thead><tbody></tbody></table></div>`)
  assert.equal(days[0].menuDate, '2027-01-01')
})

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
