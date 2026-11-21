import test from 'node:test'
import assert from 'node:assert/strict'
import { createCalendar, isTimedPiece, normalizeClassDate, sessionDateRange } from '../src/utils/calendar.js'

const now = new Date('2026-10-30T12:34:56.789Z')
const meeting = (day = 0, extra = {}) => ({
  key: 'CMPSC 16', wTime: [day * 1440 + 9 * 60, day * 1440 + 10 * 60],
  location: 'PHELPS 3525', ...extra
})
const calendar = (extra = {}) => createCalendar({
  quarter: '20261', pieces: [meeting()], startDate: '2026-03-02',
  endDate: '2026-03-22', now, ...extra
})
const unfold = content => content.replace(/\r\n[ \t]/g, '')
const events = content => [...unfold(content).matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map(match => match[1])
const property = (event, name) => event.split('\r\n').find(line => line.startsWith(`${name}:`))?.slice(name.length + 1)
const uids = content => events(content).map(event => property(event, 'UID'))

test('weekly dates include both first and last class dates', () => {
  const result = calendar({ endDate: '2026-03-16' })
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 0)
  assert.match(result.content, /DTSTART;TZID=America\/Los_Angeles:20260302T090000\r\n/)
  assert.match(result.content, /DTEND;TZID=America\/Los_Angeles:20260302T100000\r\n/)
  assert.match(result.content, /RRULE:FREQ=WEEKLY;UNTIL=20260317T065959Z\r\n/)
})

test('a one-day date range includes its matching weekday once', () => {
  const result = calendar({ endDate: '2026-03-02' })
  assert.match(result.content, /RRULE:FREQ=WEEKLY;UNTIL=20260303T075959Z\r\n/)
})

test('a grouped series starts on its first actual weekday within a midweek bound', () => {
  const result = calendar({
    pieces: [meeting(0), meeting(2), meeting(6)], startDate: '2026-03-04', endDate: '2026-03-17'
  })
  assert.equal(result.eventCount, 1)
  const [event] = events(result.content)
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20260304T090000')
  assert.equal(property(event, 'RRULE'), 'FREQ=WEEKLY;UNTIL=20260318T065959Z;BYDAY=MO,WE,SU')
})

test('all seven Monday-based weekday offsets export on the right dates', () => {
  const pieces = Array.from({ length: 7 }, (_, day) => meeting(day, { key: `Class ${day}` }))
  const result = calendar({ pieces, endDate: '2026-03-08' })
  assert.equal(result.eventCount, 7)
  assert.deepEqual(events(result.content).map(event => property(event, 'DTSTART;TZID=America/Los_Angeles')),
    Array.from({ length: 7 }, (_, index) => `2026030${index + 2}T090000`))
})

test('meetings outside a short range are skipped while in-range meetings survive', () => {
  const result = calendar({ pieces: [meeting(0), meeting(6)], endDate: '2026-03-02' })
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 1)
})

test('spring DST preserves local start/end times and weekly recurrence', () => {
  const content = calendar({ endDate: '2026-03-16' }).content
  assert.match(content, /BEGIN:VTIMEZONE\r\nTZID:America\/Los_Angeles\r\n/)
  assert.match(content, /DTSTART:20070311T020000\r\nTZOFFSETFROM:-0800\r\nTZOFFSETTO:-0700\r\nTZNAME:PDT\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU/)
  const event = events(content)[0]
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20260302T090000')
  assert.equal(property(event, 'RRULE'), 'FREQ=WEEKLY;UNTIL=20260317T065959Z')
  assert.doesNotMatch(event, /DT(?:START|END)[^:\r\n]*:\d{8}T\d{6}Z|COUNT=/)
})

test('fall DST includes standard-time rules and does not truncate November occurrences', () => {
  const content = calendar({ quarter: '20264', startDate: '2026-10-26', endDate: '2026-11-09' }).content
  assert.match(content, /DTSTART:20071104T020000\r\nTZOFFSETFROM:-0700\r\nTZOFFSETTO:-0800\r\nTZNAME:PST\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU/)
  const event = events(content)[0]
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20261026T090000')
  assert.equal(property(event, 'RRULE'), 'FREQ=WEEKLY;UNTIL=20261110T075959Z')
})

test('UTC recurrence bounds use the Pacific offset on the inclusive last date, including transition Sundays', () => {
  for (const [date, day, until] of [
    ['2026-03-07', 5, '20260308T075959Z'],
    ['2026-03-08', 6, '20260309T065959Z'],
    ['2026-03-09', 0, '20260310T065959Z'],
    ['2026-10-31', 5, '20261101T065959Z'],
    ['2026-11-01', 6, '20261102T075959Z'],
    ['2026-11-02', 0, '20261103T075959Z']
  ]) {
    const content = calendar({ startDate: date, endDate: date, pieces: [meeting(day)] }).content
    assert.equal(property(events(content)[0], 'RRULE'), `FREQ=WEEKLY;UNTIL=${until}`, date)
  }
})

test('Sunday 02:30 recurrence remains bounded when the spring DST occurrence does not exist', () => {
  const content = calendar({
    startDate: '2026-03-01', endDate: '2026-03-15',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })]
  }).content
  const event = events(content)[0]
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20260301T023000')
  assert.equal(property(event, 'DTEND;TZID=America/Los_Angeles'), '20260301T033000')
  assert.equal(property(event, 'RRULE'), 'FREQ=WEEKLY;UNTIL=20260316T065959Z')
  assert.doesNotMatch(event, /COUNT=/)
})

test('a nonexistent initial Sunday 02:30 moves to the next valid Sunday within the range', () => {
  const content = calendar({
    startDate: '2026-03-08', endDate: '2026-03-15',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })]
  }).content
  const event = events(content)[0]
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20260315T023000')
  assert.equal(property(event, 'DTEND;TZID=America/Los_Angeles'), '20260315T033000')
  assert.equal(property(event, 'RRULE'), 'FREQ=WEEKLY;UNTIL=20260316T065959Z')
})

test('a range containing only a nonexistent Sunday 02:30 reports no valid meetings', () => {
  assert.throws(() => calendar({
    startDate: '2026-03-08', endDate: '2026-03-08',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })]
  }), /No scheduled meetings fall within these dates/)
})

test('only spring-gap meetings are skipped; surrounding local Sunday times remain valid', () => {
  const result = calendar({
    startDate: '2026-03-08', endDate: '2026-03-08',
    pieces: [90, 150, 210].map(minutes => meeting(6, { wTime: [6 * 1440 + minutes, 6 * 1440 + minutes + 29] }))
  })
  assert.equal(result.eventCount, 2)
  assert.equal(result.skippedCount, 1)
  assert.deepEqual(events(result.content).map(event => property(event, 'DTSTART;TZID=America/Los_Angeles')),
    ['20260308T013000', '20260308T033000'])
})

test('fall transition Sunday 02:30 remains valid with a standard-time end bound', () => {
  const content = calendar({
    quarter: '20264', startDate: '2026-11-01', endDate: '2026-11-01',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })]
  }).content
  const event = events(content)[0]
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20261101T023000')
  assert.equal(property(event, 'RRULE'), 'FREQ=WEEKLY;UNTIL=20261102T075959Z')
})

test('Sunday meetings crossing spring or fall clock changes reject with actionable meeting context', () => {
  for (const [startDate, endDate] of [['2026-03-01', '2026-03-15'], ['2026-10-25', '2026-11-08']]) {
    assert.throws(() => calendar({
      startDate, endDate,
      pieces: [meeting(6, { title: 'Night study', wTime: [6 * 1440 + 90, 6 * 1440 + 210] })]
    }), error => {
      assert.match(error.message, /Night study/)
      assert.match(error.message, /crosses a daylight-saving time change/)
      assert.match(error.message, /date range excluding that day/)
      assert.match(error.message, /add that occurrence separately/)
      return true
    })
  }
})

test('clock-change rejection includes an end exactly at 02:00, but permits 01:59', () => {
  for (const date of ['2026-03-08', '2026-11-01']) {
    const early = end => meeting(6, { wTime: [6 * 1440 + 90, 6 * 1440 + end] })
    assert.throws(() => calendar({ startDate: date, endDate: date, pieces: [early(120)] }), /CMPSC 16:.*daylight-saving/)
    const result = calendar({ startDate: date, endDate: date, pieces: [early(119)] })
    assert.equal(result.eventCount, 1)
    assert.equal(property(events(result.content)[0], 'DTEND;TZID=America/Los_Angeles'), `${date.replaceAll('-', '')}T015900`)
  }
})

test('Sunday meetings ending at next-day midnight also reject when they cross a clock change', () => {
  for (const date of ['2026-03-08', '2026-11-01']) {
    for (const minutes of [0, 90]) {
      assert.throws(() => calendar({
        startDate: date, endDate: date,
        pieces: [meeting(6, { wTime: [6 * 1440 + minutes, 7 * 1440] })]
      }), /crosses a daylight-saving time change/)
    }
  }
})

test('Sunday meetings spanning 02:00 export normally when their range excludes the transition', () => {
  for (const [startDate, endDate, firstSunday] of [
    ['2026-03-01', '2026-03-07', '20260301'],
    ['2026-03-09', '2026-03-15', '20260315'],
    ['2026-10-25', '2026-10-31', '20261025'],
    ['2026-11-02', '2026-11-08', '20261108']
  ]) {
    const result = calendar({
      startDate, endDate, pieces: [meeting(6, { wTime: [6 * 1440 + 90, 6 * 1440 + 210] })]
    })
    assert.equal(result.eventCount, 1)
    const event = events(result.content)[0]
    assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), `${firstSunday}T013000`)
    assert.equal(property(event, 'DTEND;TZID=America/Los_Angeles'), `${firstSunday}T033000`)
  }
})

test('clock-change validation uses effective session dates rather than the broader quarter dates', () => {
  const pieces = [meeting(6, { session: 'Session A', wTime: [6 * 1440 + 90, 6 * 1440 + 210] })]
  const result = calendar({
    startDate: '2026-03-01', endDate: '2026-03-15', pieces,
    sessionRanges: { 'Session A': { startDate: '2026-03-09', endDate: '2026-03-15' } }
  })
  assert.equal(result.eventCount, 1)
  assert.equal(property(events(result.content)[0], 'DTSTART;TZID=America/Los_Angeles'), '20260315T013000')
  assert.throws(() => calendar({
    startDate: '2026-03-01', endDate: '2026-03-15', pieces,
    sessionRanges: { 'Session A': { startDate: '2026-03-01', endDate: '2026-03-08' } }
  }), /crosses a daylight-saving time change/)
})

test('non-Sunday meetings spanning 02:00 remain valid across a DST-spanning date range', () => {
  const result = calendar({ pieces: [meeting(1, { wTime: [1440 + 90, 1440 + 210] })] })
  assert.equal(result.eventCount, 1)
  const event = events(result.content)[0]
  assert.equal(property(event, 'DTSTART;TZID=America/Los_Angeles'), '20260303T013000')
  assert.equal(property(event, 'DTEND;TZID=America/Los_Angeles'), '20260303T033000')
})

test('fall Sunday meetings starting at or after 02:00 remain valid on the transition', () => {
  const result = calendar({
    startDate: '2026-11-01', endDate: '2026-11-01',
    pieces: [120, 150].map(minutes => meeting(6, { wTime: [6 * 1440 + minutes, 6 * 1440 + minutes + 30] }))
  })
  assert.equal(result.eventCount, 2)
  assert.deepEqual(events(result.content).map(event => property(event, 'DTSTART;TZID=America/Los_Angeles')),
    ['20261101T020000', '20261101T023000'])
})

test('explicit dates are used for the selected quarter without borrowing current-quarter dates', () => {
  const result = calendar({ quarter: '20274', startDate: '2027-09-27', endDate: '2027-10-11' })
  assert.match(result.content, /X-WR-CALNAME:GoGaucho 20274/)
  assert.match(result.content, /DTSTART;TZID=America\/Los_Angeles:20270927T090000/)
  assert.match(result.content, /RRULE:FREQ=WEEKLY;UNTIL=20271012T065959Z/)
})

test('invalid and missing quarter identifiers fail before export', () => {
  for (const quarter of ['', undefined, '20260', '20265', '26Q1', '20261extra']) {
    assert.throws(() => calendar({ quarter }), /Select a quarter/)
  }
})

test('overall date bounds reject absent, malformed, impossible and reversed dates', () => {
  for (const startDate of ['', undefined, '2026-2-02', '2026-02-30', 'invalid', '2026-03-02T00:00:00Z']) {
    assert.throws(() => calendar({ startDate }), /valid first and last class dates/)
  }
  for (const endDate of ['', '2026-02-30', '2026-13-01']) {
    assert.throws(() => calendar({ endDate }), /valid first and last class dates/)
  }
  assert.throws(() => calendar({ startDate: '2026-03-23' }), /on or after/)
  assert.throws(() => calendar({ startDate: '2006-12-25', endDate: '2007-01-08' }), /2007 onward/)
})

test('session dates are required for each timed session', () => {
  assert.throws(() => calendar({ pieces: [meeting(0, { session: 'Session A' })] }), /Enter the class dates for Session A/)
})

test('sessions require valid ordered dates within the overall bounds', () => {
  const pieces = [meeting(0, { session: 'Session A' })]
  for (const range of [
    { startDate: '', endDate: '2026-03-16' },
    { startDate: '2026-02-30', endDate: '2026-03-16' },
    { startDate: '2026-03-16', endDate: '2026-03-09' }
  ]) {
    assert.throws(() => calendar({ pieces, sessionRanges: { 'Session A': range } }), /Session A:/)
  }
  for (const range of [
    { startDate: '2026-03-01', endDate: '2026-03-16' },
    { startDate: '2026-03-02', endDate: '2026-03-23' }
  ]) {
    assert.throws(() => calendar({ pieces, sessionRanges: { 'Session A': range } }), /session dates must fall within/)
  }
})

test('narrower session ranges control individual meetings while ordinary meetings keep overall bounds', () => {
  const result = calendar({
    pieces: [meeting(0, { session: 'Session A' }), meeting(2, { session: 'Session A' }), meeting(4, { session: 'Session B' }), meeting(6)],
    sessionRanges: {
      'Session A': { startDate: '2026-03-09', endDate: '2026-03-16' },
      'Session B': { startDate: '2026-03-20', endDate: '2026-03-22' }
    }
  })
  assert.equal(result.eventCount, 3)
  assert.deepEqual(events(result.content).map(event => [
    property(event, 'DTSTART;TZID=America/Los_Angeles'), property(event, 'RRULE')
  ]), [
    ['20260309T090000', 'FREQ=WEEKLY;UNTIL=20260317T065959Z;BYDAY=MO,WE'],
    ['20260320T090000', 'FREQ=WEEKLY;UNTIL=20260323T065959Z'],
    ['20260308T090000', 'FREQ=WEEKLY;UNTIL=20260323T065959Z']
  ])
})

test('a session range equal to the quarter bounds is accepted', () => {
  const result = calendar({
    pieces: [meeting(0, { session: 'Session A' })],
    sessionRanges: { 'Session A': { startDate: '2026-03-02', endDate: '2026-03-22' } }
  })
  assert.equal(result.eventCount, 1)
  assert.match(result.content, /RRULE:FREQ=WEEKLY;UNTIL=20260323T065959Z/)
})

test('unscheduled session pieces do not require unused session dates', () => {
  const result = calendar({ pieces: [meeting(), { key: 'TBA', session: 'Session A' }] })
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 1)
})

test('custom titles and locations are exported and untitled classes use course keys', () => {
  const result = calendar({ pieces: [meeting(), meeting(1, { key: 'custom', title: 'Research group', location: 'Library' })] })
  const actual = events(result.content)
  assert.equal(property(actual[0], 'SUMMARY'), 'CMPSC 16')
  assert.equal(property(actual[1], 'SUMMARY'), 'Research group')
  assert.equal(property(actual[1], 'LOCATION'), 'Library')
  assert.equal(property(actual[1], 'DESCRIPTION'), 'custom')
})

test('course, section and session context remain without app attribution', () => {
  const result = calendar({
    pieces: [meeting(0, { section: '0101', session: 'Session A' })],
    sessionRanges: { 'Session A': { startDate: '2026-03-02', endDate: '2026-03-22' } }
  })
  assert.equal(property(events(result.content)[0], 'DESCRIPTION'), 'CMPSC 16\\nSection 0101\\nSession A')
  assert.equal(result.events[0].summary, 'CMPSC 16')
  assert.equal(result.events[0].description, 'CMPSC 16\nSection 0101\nSession A')
  assert.doesNotMatch(result.events[0].summary, /GoGaucho|Added by|Exported from/i)
  assert.doesNotMatch(result.events[0].description, /GoGaucho|Added by|Exported from/i)
})

test('text escapes commas, semicolons, backslashes and every newline form without content injection', () => {
  const title = 'Study, group; room\\desk\r\nBEGIN:VEVENT\rnew\nline'
  const result = calendar({ pieces: [meeting(0, { title, location: 'Lab, 1; west\\wing\nFloor 2' })] })
  assert.equal(events(result.content).length, 1)
  const event = events(result.content)[0]
  assert.equal(property(event, 'SUMMARY'), 'Study\\, group\\; room\\\\desk\\nBEGIN:VEVENT\\nnew\\nline')
  assert.equal(property(event, 'LOCATION'), 'Lab\\, 1\\; west\\\\wing\\nFloor 2')
  assert.equal(result.content.replace(/\r\n/g, '').includes('\n'), false)
  assert.equal(result.content.replace(/\r\n/g, '').includes('\r'), false)
})

test('UTF-8 folding limits every physical line to 75 octets and preserves Unicode text', () => {
  const title = '课程学习🦝é'.repeat(35)
  const location = '日本語の部屋 🧪'.repeat(20)
  const result = calendar({ pieces: [meeting(0, { title, location })] })
  assert.equal(result.content.endsWith('\r\n'), true)
  assert.match(result.content, /\r\n /)
  for (const line of result.content.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `Line exceeded 75 octets: ${Buffer.byteLength(line, 'utf8')}`)
  }
  const event = events(result.content)[0]
  assert.equal(property(event, 'SUMMARY'), title)
  assert.equal(property(event, 'LOCATION'), location)
  assert.equal(result.content.includes('\uFFFD'), false)
})

test('calendar envelope, deterministic UTC stamp and CRLF framing are valid', () => {
  const content = calendar().content
  assert.ok(content.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.ok(content.endsWith('END:VCALENDAR\r\n'))
  assert.equal(property(events(content)[0], 'DTSTAMP'), '20261030T123456Z')
  assert.match(content, /PRODID:-\/\/GoGaucho\/\/Class Schedule\/\/EN/)
  assert.equal(content.replace(/\r\n/g, '').includes('\n'), false)
})

test('UIDs are stable across downloads, timestamps, input ordering and date range adjustments', () => {
  const pieces = [meeting(0), meeting(2, { section: '0101' })]
  const first = calendar({ pieces })
  const second = calendar({ pieces: [...pieces].reverse(), now: new Date('2026-11-01T00:00:00Z'), startDate: '2026-03-09' })
  assert.deepEqual(uids(first.content).sort(), uids(second.content).sort())
  assert.notEqual(first.content, second.content)
})

test('distinct lecture, section, session, time, custom title, location and quarter retain distinct UIDs', () => {
  const pieces = [
    meeting(), meeting(0, { section: '0101' }), meeting(1, { wTime: [2000, 2060] }),
    meeting(0, { session: 'Session A' }), meeting(0, { session: 'Session B' }),
    meeting(0, { title: 'Custom one' }), meeting(0, { title: 'Custom two' }),
    meeting(0, { location: 'Different building' }), meeting(0, { key: 'MATH 4A' })
  ]
  const range = { startDate: '2026-03-02', endDate: '2026-03-22' }
  const result = calendar({ pieces, sessionRanges: { 'Session A': range, 'Session B': range } })
  assert.equal(result.eventCount, pieces.length)
  assert.equal(new Set(uids(result.content)).size, pieces.length)
  assert.notEqual(uids(calendar().content)[0], uids(calendar({ quarter: '20262' }).content)[0])
})

test('identical meetings deduplicate without counting them as skipped', () => {
  const piece = meeting()
  const result = calendar({ pieces: [piece, { ...piece, wTime: [...piece.wTime] }, meeting(2)] })
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 0)
  assert.match(result.events[0].recurrence[0], /BYDAY=MO,WE$/)
})

test('a course keeps its color across separate lecture and section series', () => {
  const result = calendar({
    pieces: [
      meeting(0),
      meeting(2),
      meeting(1, { wTime: [2040, 2100] }),
      meeting(3, { section: '0101', location: 'Section room' }),
      meeting(2, { location: 'Alternate room' }),
      meeting(2, { key: 'MATH 4A' }),
      meeting(2, { key: 'custom', title: 'Study' })
    ]
  })
  const [lecture, otherTime, section, otherRoom, math, custom] = result.events
  assert.equal(result.eventCount, 6)
  assert.match(lecture.recurrence[0], /BYDAY=MO,WE$/)
  assert.ok(['1','2','3','4','5','6','7','8','9','10','11'].includes(lecture.colorId))
  assert.deepEqual([otherTime.colorId, section.colorId, otherRoom.colorId], Array(3).fill(lecture.colorId))
  assert.notEqual(math.colorId, lecture.colorId)
  assert.equal(custom.colorId, undefined)
})

test('timed-piece validation permits whole-day boundaries and Sunday midnight endpoints', () => {
  for (const wTime of [[0, 1], [0, 1440], [1380, 1440], [6 * 1440, 7 * 1440], [10079, 10080]]) {
    assert.equal(isTimedPiece({ wTime }), true, JSON.stringify(wTime))
  }
})

test('timed-piece validation rejects missing, fractional, reversed, zero-length and cross-day ranges', () => {
  for (const piece of [null, undefined, {}, { wTime: null }, { wTime: '09:00' },
    ...[[], [540], [540, 600, 660], ['540', 600], [540.5, 600], [540, Infinity],
      [-1, 60], [540, 540], [600, 540], [1380, 1441], [10080, 10100]].map(wTime => ({ wTime }))]) {
    assert.equal(isTimedPiece(piece), false, JSON.stringify(piece))
  }
})

test('malformed and unscheduled meetings are skipped alongside valid meetings', () => {
  const result = calendar({ pieces: [meeting(), null, {}, { wTime: [] }, { wTime: [540, 540] }, { wTime: [1380, 1441] }] })
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 5)
})

test('empty schedules, schedules with only malformed meetings and ranges with no matching weekdays fail usefully', () => {
  for (const pieces of [[], [null, {}, { wTime: [] }], [meeting(6)]]) {
    assert.throws(() => calendar({ pieces, endDate: '2026-03-02' }), /No scheduled meetings fall within these dates/)
  }
})

test('meetings ending at midnight use the next calendar date, including Sunday into Monday', () => {
  const result = calendar({ pieces: [meeting(0, { wTime: [1380, 1440] }), meeting(6, { key: 'MATH 4A', wTime: [10020, 10080] })] })
  assert.deepEqual(events(result.content).map(event => property(event, 'DTEND;TZID=America/Los_Angeles')),
    ['20260303T000000', '20260309T000000'])
})

test('date metadata normalizes ISO dates, ISO timestamps and slash-form dates', () => {
  for (const value of ['2026-03-02', '2026-03-02T00:00:00Z', '2026-03-02 00:00:00', '3/2/2026', '03/02/2026']) {
    assert.equal(normalizeClassDate(value), '2026-03-02')
  }
  assert.equal(normalizeClassDate('2/29/2028'), '2028-02-29')
})

test('invalid date metadata cannot silently roll into another month', () => {
  for (const value of [null, undefined, 20260302, '', '2026-02-29', '2/30/2026', '2026-13-02', '3/2/26', '2026-03-02garbage']) {
    assert.equal(normalizeClassDate(value), '', String(value))
  }
})

test('session metadata parses month/day dates using the selected quarter year', () => {
  assert.deepEqual(sessionDateRange('Session A (6/22 - 7/31)', '20263'), { startDate: '2026-06-22', endDate: '2026-07-31' })
  assert.deepEqual(sessionDateRange('Session A (06/22/2026 - 07/31/2026)', '20263'), { startDate: '2026-06-22', endDate: '2026-07-31' })
  assert.deepEqual(sessionDateRange('Session A (2026-06-22 - 2026-07-31)', '20263'), { startDate: '2026-06-22', endDate: '2026-07-31' })
})

test('missing and invalid session metadata leave dates blank for user confirmation', () => {
  assert.deepEqual(sessionDateRange('', '20263'), { startDate: '', endDate: '' })
  assert.deepEqual(sessionDateRange('Session A', '20263'), { startDate: '', endDate: '' })
  assert.deepEqual(sessionDateRange('Session A (2/30 - 13/31)', '20263'), { startDate: '', endDate: '' })
})

test('normalized private Google events preserve the same class, session, custom and duplicate decisions as the file', () => {
  const course = meeting(0, { section: '0101' })
  const result = calendar({
    pieces: [course, { ...course, wTime: [...course.wTime] },
      meeting(2, { session: 'Session A' }),
      meeting(6, { key: 'custom', title: '课程 🦝, study; group\\desk\nFloor 2', location: 'Library, north; room\\2', wTime: [10020, 10080] }),
      { key: 'TBA' }],
    sessionRanges: { 'Session A': { startDate: '2026-03-09', endDate: '2026-03-16' } }
  })
  assert.equal(result.eventCount, 3)
  assert.equal(result.skippedCount, 1)
  assert.equal(result.events.length, result.eventCount)
  const fileEvents = events(result.content)
  const compact = value => value.replaceAll('-', '').replaceAll(':', '')
  const decodeText = value => value.replace(/\\([\\;,nN])/g, (_, char) => /[nN]/.test(char) ? '\n' : char)
  for (const [index, googleEvent] of result.events.entries()) {
    assert.equal(googleEvent.visibility, 'private')
    assert.equal(googleEvent.start.timeZone, 'America/Los_Angeles')
    assert.equal(googleEvent.end.timeZone, 'America/Los_Angeles')
    assert.equal(compact(googleEvent.start.dateTime), property(fileEvents[index], 'DTSTART;TZID=America/Los_Angeles'))
    assert.equal(compact(googleEvent.end.dateTime), property(fileEvents[index], 'DTEND;TZID=America/Los_Angeles'))
    assert.deepEqual(googleEvent.recurrence, [`RRULE:${property(fileEvents[index], 'RRULE')}`])
    assert.equal(googleEvent.summary, decodeText(property(fileEvents[index], 'SUMMARY')))
    assert.equal(googleEvent.location, decodeText(property(fileEvents[index], 'LOCATION')))
    assert.equal(googleEvent.description, decodeText(property(fileEvents[index], 'DESCRIPTION')))
    assert.doesNotMatch(googleEvent.summary, /GoGaucho|Added by|Exported from/i)
    assert.doesNotMatch(googleEvent.description, /GoGaucho|Added by|Exported from/i)
  }
  assert.deepEqual(result.events.map(event => event.start.dateTime),
    ['2026-03-02T09:00:00', '2026-03-11T09:00:00', '2026-03-08T23:00:00'])
  assert.equal(result.events[1].recurrence[0], 'RRULE:FREQ=WEEKLY;UNTIL=20260317T065959Z')
  assert.equal(result.events[2].end.dateTime, '2026-03-09T00:00:00')
})

test('Google payloads use the same valid post-gap Sunday start and bounded spring recurrence', () => {
  const result = calendar({
    startDate: '2026-03-08', endDate: '2026-03-15',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })]
  })
  assert.deepEqual(result.events, [{
    summary: 'CMPSC 16', location: 'PHELPS 3525', description: 'CMPSC 16',
    start: { dateTime: '2026-03-15T02:30:00', timeZone: 'America/Los_Angeles' },
    end: { dateTime: '2026-03-15T03:30:00', timeZone: 'America/Los_Angeles' },
    recurrence: ['RRULE:FREQ=WEEKLY;UNTIL=20260316T065959Z'], visibility: 'private', colorId: '9'
  }])
})

test('Google event data uses standard-time recurrence bounds and unescaped text for an editable copy', () => {
  const result = calendar({
    quarter: '20264', startDate: '2026-10-26', endDate: '2026-11-09',
    pieces: [meeting(0, { key: 'custom', title: 'Office hours, A; B', location: undefined })]
  })
  const [event] = result.events
  assert.equal(event.summary, 'Office hours, A; B')
  assert.equal(event.location, '')
  assert.equal(event.start.dateTime, '2026-10-26T09:00:00')
  assert.equal(event.end.dateTime, '2026-10-26T10:00:00')
  assert.deepEqual(event.recurrence, ['RRULE:FREQ=WEEKLY;UNTIL=20261110T075959Z'])
  assert.equal(event.visibility, 'private')
  assert.equal('attendees' in event, false)
  assert.equal('organizer' in event, false)
})
