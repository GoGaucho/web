import test from 'node:test'
import assert from 'node:assert/strict'
import { createCalendar } from '../src/utils/calendar.js'
import { getAcademicCalendar, getScheduleCalendar } from '../src/utils/academic-calendar.js'

const now = new Date('2026-11-13T12:00:00Z')
const meeting = (day = 2, extra = {}) => ({ key: 'CMPSC 16', wTime: [day * 1440 + 540, day * 1440 + 600], location: 'WEEKLY ROOM', ...extra })
const calendar = (extra = {}) => createCalendar({
  quarter: '20264', startDate: '2026-09-24', endDate: '2026-12-04',
  pieces: [meeting()], now, ...extra
})
const final = (extra = {}) => ({ courseKey: 'CMPSC 16', hasFinals: true, examDate: '2026-12-08', beginTime: '08:00', endTime: '11:00', ...extra })
const withFinals = (extra = {}) => calendar({ finalsEndDate: '2026-12-11', finals: [final()], ...extra })
const fileEvents = content => [...content.replace(/\r\n[ \t]/g, '').matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map(match => match[1])
const value = (event, name) => event.split('\r\n').find(line => line.startsWith(`${name}:`))?.slice(name.length + 1)
const exclusions = recurrence => recurrence.filter(line => line.startsWith('EXDATE;')).flatMap(line => line.slice(line.indexOf(':') + 1).split(','))
const examEvents = result => result.events.filter(event => event.summary.endsWith(' Final'))

test('verified academic metadata separates instructional and final-exam bounds for covered quarters', () => {
  for (const [quarter, first, last, finalFirst, finalLast, holidays] of [
    ['20264', '2026-09-24', '2026-12-04', '2026-12-05', '2026-12-11', ['2026-11-11', '2026-11-26', '2026-11-27']],
    ['20271', '2027-01-04', '2027-03-12', '2027-03-13', '2027-03-19', ['2027-01-18', '2027-02-15']],
    ['20272', '2027-03-29', '2027-06-04', '2027-06-05', '2027-06-11', ['2027-05-31']]
  ]) {
    const metadata = getAcademicCalendar(quarter)
    assert.deepEqual([metadata.startDate, metadata.endDate, metadata.finalsStartDate, metadata.finalsEndDate, metadata.noClassDates],
      [first, last, finalFirst, finalLast, holidays])
    assert.equal(metadata.academicYear, '2026-2027')
    assert.equal(metadata.sourceUrl, 'https://registrar.sa.ucsb.edu/calendars/academic-calendars')
  }
})

test('academic metadata returns independent values and never guesses unsupported terms', () => {
  const first = getAcademicCalendar('20264')
  first.noClassDates.push('2026-12-01')
  first.startDate = '2026-01-01'
  assert.equal(getAcademicCalendar('20264').startDate, '2026-09-24')
  assert.deepEqual(getAcademicCalendar('20264').noClassDates, ['2026-11-11', '2026-11-26', '2026-11-27'])
  for (const quarter of ['20233', '20303', '20994', '', undefined, 'toString', 'constructor']) {
    assert.equal(getAcademicCalendar(quarter), null, String(quarter))
  }
})

test('summer export uses each published session range and skips only matching class holidays', () => {
  const quarter = '20263'
  const pieces = [
    meeting(4, { key: 'A class', session: 'Sess A (6/22 - 8/1)' }),
    meeting(0, { key: 'B class', session: 'Session B' }),
    meeting(4, { key: 'C class', session: 'C' }),
    meeting(4, { key: 'D class', session: 'Sess. D (6/22 - 7/11)' }),
    meeting(0, { key: 'E class', session: 'Session E' }),
    meeting(0, { key: 'F class', session: 'Session F' }),
    meeting(0, { key: 'G class', session: 'Session G' }),
    meeting(4, { key: 'custom', title: 'Study' }),
    { key: 'TBA' }
  ]
  const metadata = getScheduleCalendar(quarter, pieces)
  assert.deepEqual(metadata.noClassDates, ['2026-07-03', '2026-09-07'])
  assert.equal(metadata.academicYear, '2025-2026')
  const result = calendar({ ...metadata, quarter, pieces })
  assert.deepEqual(result.events.map(event => [
    event.summary, event.start.dateTime.slice(0, 10), event.recurrence[0].split('UNTIL=')[1], exclusions(event.recurrence)
  ]), [
    ['A class', '2026-06-26', '20260801T065959Z', ['20260703T090000']],
    ['B class', '2026-08-03', '20260912T065959Z', ['20260907T090000']],
    ['C class', '2026-06-26', '20260829T065959Z', ['20260703T090000']],
    ['D class', '2026-06-26', '20260711T065959Z', ['20260703T090000']],
    ['E class', '2026-07-13', '20260801T065959Z', []],
    ['F class', '2026-08-03', '20260822T065959Z', []],
    ['G class', '2026-08-24', '20260912T065959Z', ['20260907T090000']],
    ['Study', '2026-06-26', '20260912T065959Z', []]
  ])
})

test('summer export uses the selected year and requires every timed class to have a known session', () => {
  const quarter = '20273'
  const pieces = [meeting(0, { session: 'Sess A (6/21 - 7/31)' })]
  const metadata = getScheduleCalendar(quarter, pieces)
  const result = calendar({ ...metadata, quarter, pieces })
  assert.equal(result.events[0].start.dateTime, '2027-06-21T09:00:00')
  assert.deepEqual(exclusions(result.events[0].recurrence), ['20270705T090000'])
  for (const session of ['', 'Session H', 'unknown']) {
    const pieces = [meeting(0, { session })]
    const dates = getScheduleCalendar(quarter, pieces)
    assert.throws(() => calendar({ ...dates, quarter, pieces }), /session|class dates/i)
  }
  assert.equal(getScheduleCalendar('20303', pieces), null)
})

test('future calendar copies skip observed holidays and keep custom events', () => {
  const quarter = '20284'
  const metadata = getAcademicCalendar(quarter)
  assert.equal(metadata.academicYear, '2028-2029')
  assert.deepEqual(metadata.noClassDates, ['2028-11-10', '2028-11-23', '2028-11-24'])
  const result = calendar({ quarter, ...metadata, pieces: [meeting(4), meeting(4, { key: 'custom', title: 'Study' })] })
  assert.deepEqual(result.events.map(event => exclusions(event.recurrence)), [['20281110T090000', '20281124T090000'], []])
  assert.equal(getAcademicCalendar('20342').academicYear, '2033-2034')
})

test('Fall Veterans Day and Thanksgiving closures exclude only matching enrolled weekdays with file/API parity', () => {
  const metadata = getAcademicCalendar('20264')
  const result = calendar({ ...metadata, pieces: Array.from({ length: 5 }, (_, day) => meeting(day)) })
  assert.equal(result.eventCount, 5)
  assert.deepEqual(result.events.map(event => exclusions(event.recurrence)), [[], [],
    ['20261111T090000'], ['20261126T090000'], ['20261127T090000']])
  for (const [index, event] of fileEvents(result.content).entries()) {
    const fileRules = event.split('\r\n').filter(line => /^(RRULE:|EXDATE;)/.test(line))
    assert.deepEqual(fileRules, result.events[index].recurrence)
    assert.equal(result.events[index].start.timeZone, 'America/Los_Angeles')
  }
})

test('closure exceptions are sorted, deduplicated and limited to the effective session and weekday', () => {
  const noClassDates = ['2026-11-25', '2026-11-11', '2026-11-18', '2026-11-11', '2026-11-12', '2026-10-28', '2026-12-02']
  const original = [...noClassDates]
  const result = calendar({
    pieces: [meeting(2, { session: 'Session A' })], noClassDates,
    sessionRanges: { 'Session A': { startDate: '2026-11-04', endDate: '2026-11-25' } }
  })
  assert.deepEqual(exclusions(result.events[0].recurrence), ['20261111T090000', '20261118T090000', '20261125T090000'])
  assert.deepEqual(noClassDates, original)
  assert.equal(result.events[0].recurrence[0], 'RRULE:FREQ=WEEKLY;UNTIL=20261126T075959Z')
})

test('a closure on the first class advances DTSTART and a closure on the last class remains excluded', () => {
  const result = calendar({ startDate: '2026-11-11', endDate: '2026-11-25', noClassDates: ['2026-11-11', '2026-11-25'] })
  assert.equal(result.events[0].start.dateTime, '2026-11-18T09:00:00')
  assert.deepEqual(exclusions(result.events[0].recurrence), ['20261125T090000'])
  assert.equal(value(fileEvents(result.content)[0], 'DTSTART;TZID=America/Los_Angeles'), '20261118T090000')
})

test('all-excluded class series are skipped while custom events retain holiday occurrences', () => {
  const result = calendar({
    startDate: '2026-11-11', endDate: '2026-11-11', noClassDates: ['2026-11-11'],
    pieces: [meeting(), meeting(2, { key: 'custom', title: 'Personal event' })]
  })
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 1)
  assert.equal(result.events[0].summary, 'Personal event')
  assert.equal(result.events[0].start.dateTime, '2026-11-11T09:00:00')
  assert.deepEqual(exclusions(result.events[0].recurrence), [])
  assert.throws(() => calendar({ startDate: '2026-11-11', endDate: '2026-11-11', noClassDates: ['2026-11-11'] }), /No scheduled meetings/)
})

test('custom events receive no closure exceptions even when enrolled meetings share their exact time', () => {
  const result = calendar({ pieces: [meeting(), meeting(2, { key: 'custom', title: 'Study' })], noClassDates: ['2026-11-11'] })
  assert.deepEqual(exclusions(result.events[0].recurrence), ['20261111T090000'])
  assert.deepEqual(exclusions(result.events[1].recurrence), [])
})

test('closures stay in Pacific local time across DST rather than becoming UTC exceptions', () => {
  const result = calendar({
    quarter: '20261', startDate: '2026-03-02', endDate: '2026-03-22',
    pieces: [meeting(0)], noClassDates: ['2026-03-09', '2026-03-16']
  })
  assert.equal(result.events[0].start.dateTime, '2026-03-02T09:00:00')
  assert.deepEqual(result.events[0].recurrence, ['RRULE:FREQ=WEEKLY;UNTIL=20260323T065959Z',
    'EXDATE;TZID=America/Los_Angeles:20260309T090000,20260316T090000'])
})

test('advancing through initial closures also skips a nonexistent spring-DST start', () => {
  const result = calendar({
    quarter: '20261', startDate: '2026-03-01', endDate: '2026-03-22',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })],
    noClassDates: ['2026-03-01', '2026-03-15']
  })
  assert.equal(result.events[0].start.dateTime, '2026-03-22T02:30:00')
  assert.deepEqual(exclusions(result.events[0].recurrence), [])
  const withoutInitialClosure = calendar({
    quarter: '20261', startDate: '2026-03-01', endDate: '2026-03-22',
    pieces: [meeting(6, { wTime: [6 * 1440 + 150, 6 * 1440 + 210] })], noClassDates: ['2026-03-08']
  })
  assert.deepEqual(exclusions(withoutInitialClosure.events[0].recurrence), [])
})

test('excluding a clock-change Sunday permits remaining enrolled meetings but custom crossings still reject', () => {
  for (const [startDate, endDate, transition] of [
    ['2026-03-01', '2026-03-15', '2026-03-08'], ['2026-10-25', '2026-11-08', '2026-11-01']
  ]) {
    const piece = meeting(6, { wTime: [6 * 1440 + 90, 6 * 1440 + 210] })
    const result = calendar({ startDate, endDate, pieces: [piece], noClassDates: [transition] })
    assert.deepEqual(exclusions(result.events[0].recurrence), [transition.replaceAll('-', '') + 'T013000'])
    assert.throws(() => calendar({ startDate, endDate, pieces: [{ ...piece, key: 'custom' }], noClassDates: [transition] }), /daylight-saving time change/)
  }
})

test('invalid closure metadata fails before creating any events', () => {
  for (const noClassDates of [null, '2026-11-11', {}, [''], [null], ['2026-02-30'], ['11/11/2026'], ['2026-11-11T00:00:00Z']]) {
    assert.throws(() => calendar({ noClassDates }), /no-class dates are invalid/)
  }
})

test('confirmed finals after instruction end are single private Pacific events with no recurrence or weekly classroom guess', () => {
  const result = withFinals()
  const [exam] = examEvents(result)
  assert.equal(result.eventCount, 2)
  assert.equal(result.skippedCount, 0)
  assert.deepEqual(result.unavailableFinals, [])
  assert.deepEqual(exam, {
    summary: 'CMPSC 16 Final', description: 'CMPSC 16', location: '',
    start: { dateTime: '2026-12-08T08:00:00', timeZone: 'America/Los_Angeles' },
    end: { dateTime: '2026-12-08T11:00:00', timeZone: 'America/Los_Angeles' }, visibility: 'private'
  })
  const fileExam = fileEvents(result.content)[1]
  assert.equal(value(fileExam, 'SUMMARY'), 'CMPSC 16 Final')
  assert.equal(value(fileExam, 'DTSTART;TZID=America/Los_Angeles'), '20261208T080000')
  assert.equal(value(fileExam, 'DTEND;TZID=America/Los_Angeles'), '20261208T110000')
  assert.equal(value(fileExam, 'LOCATION'), '')
  assert.doesNotMatch(fileExam, /RRULE:|EXDATE;|WEEKLY ROOM|GoGaucho|Added by|Exported from/)
})

test('final comments and explicit exam location survive without app attribution or text injection', () => {
  const result = withFinals({ finals: [final({ comments: 'Bring calculator; notes, allowed\n课程 🦝', location: 'EXAM HALL, 1; east' })] })
  const exam = examEvents(result)[0]
  assert.equal(exam.description, 'CMPSC 16\nBring calculator; notes, allowed\n课程 🦝')
  assert.equal(exam.location, 'EXAM HALL, 1; east')
  const fileExam = fileEvents(result.content)[1]
  assert.equal(value(fileExam, 'DESCRIPTION'), 'CMPSC 16\\nBring calculator\\; notes\\, allowed\\n课程 🦝')
  assert.equal(value(fileExam, 'LOCATION'), 'EXAM HALL\\, 1\\; east')
  assert.doesNotMatch(exam.summary + exam.description, /GoGaucho|Added by|Exported from/)
})

test('duplicate enrollment/section finals normalize dates and zero seconds into one course/date/time event', () => {
  const result = withFinals({ finals: [final(), final({ examDate: '12/8/2026', beginTime: '08:00:00', endTime: '11:00:00', enrollCode: '12345' }),
    final({ courseKey: ' CMPSC 16 ', examDate: '2026-12-08T00:00:00Z', enrollCode: '67890', section: '0101' })] })
  assert.equal(examEvents(result).length, 1)
  assert.equal(result.eventCount, 2)
  assert.equal(result.skippedCount, 0)
})

test('different courses and distinct confirmed times retain separate finals with stable distinct UIDs', () => {
  const finals = [final(), final({ courseKey: 'MATH 6A' }), final({ beginTime: '12:00', endTime: '15:00' })]
  const first = withFinals({ finals }), second = withFinals({ finals: [...finals].reverse(), now: new Date('2026-12-01T00:00:00Z') })
  assert.equal(examEvents(first).length, 3)
  const ids = result => fileEvents(result.content).map(event => value(event, 'UID'))
  assert.equal(new Set(ids(first)).size, 4)
  assert.deepEqual(ids(first).sort(), ids(second).sort())
})

test('explicit no-final courses are omitted without being reported unavailable', () => {
  const result = withFinals({ finals: [final({ hasFinals: false, examDate: undefined, beginTime: undefined, endTime: undefined })] })
  assert.equal(examEvents(result).length, 0)
  assert.deepEqual(result.unavailableFinals, [])
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 0)
})

test('TBA, absent, malformed and non-increasing exam details are unavailable rather than invented', () => {
  for (const extra of [
    { examDate: undefined }, { examDate: 'TBA' }, { examDate: '2026-02-30' }, { beginTime: undefined },
    { beginTime: 'TBA' }, { beginTime: '8:00' }, { beginTime: '08:00:30' }, { beginTime: '24:00' },
    { beginTime: '08:60' }, { endTime: undefined }, { endTime: '08:00' }, { endTime: '07:59' }, { endTime: '24:00' }
  ]) {
    const result = withFinals({ finals: [final(extra)] })
    assert.deepEqual(result.unavailableFinals, ['CMPSC 16'], JSON.stringify(extra))
    assert.equal(examEvents(result).length, 0)
    assert.equal(result.eventCount, 1)
    assert.equal(result.skippedCount, 0)
  }
})

test('finals require valid known term-end metadata instead of guessing an examination week', () => {
  for (const finalsEndDate of ['', undefined, 'TBA', '2026-02-30', '2026-12-03']) {
    const result = withFinals({ finalsEndDate })
    assert.equal(examEvents(result).length, 0)
    assert.deepEqual(result.unavailableFinals, ['CMPSC 16'])
  }
})

test('confirmed dates include both known term boundaries, allow instruction-period exams and reject outside dates', () => {
  const result = withFinals({ finals: ['2026-09-24', '2026-11-10', '2026-12-11'].map(examDate => final({ examDate })) })
  assert.equal(examEvents(result).length, 3)
  assert.deepEqual(result.unavailableFinals, [])
  for (const examDate of ['2026-09-23', '2026-12-12', '2025-12-08', '2027-12-08']) {
    const rejected = withFinals({ finals: [final({ examDate })] })
    assert.equal(examEvents(rejected).length, 0)
    assert.deepEqual(rejected.unavailableFinals, ['CMPSC 16'])
  }
})

test('final payload validation rejects malformed records instead of treating them as confirmed data', () => {
  for (const finals of [null, {}, 'TBA', [null], [{}], [final({ courseKey: '' })], [final({ courseKey: '  ' })],
    [final({ courseKey: 16 })], [final({ hasFinals: 'true' })], [final({ hasFinals: undefined })]]) {
    assert.throws(() => withFinals({ finals }), /Final-exam information is invalid/)
  }
})

test('unavailable finals are unique course warnings and do not alter unscheduled weekly counts', () => {
  const result = withFinals({ pieces: [meeting(), { key: 'TBA' }], finals: [
    final({ beginTime: 'TBA' }), final({ endTime: 'TBA' }), final({ courseKey: 'MATH 6A', examDate: '' })
  ] })
  assert.deepEqual(result.unavailableFinals, ['CMPSC 16', 'MATH 6A'])
  assert.equal(result.skippedCount, 1)
  assert.equal(result.eventCount, 1)
})

test('valid finals can be exported alone or when closures remove all weekly meetings', () => {
  const alone = withFinals({ pieces: [] })
  assert.equal(alone.eventCount, 1)
  assert.equal(alone.skippedCount, 0)
  assert.equal(examEvents(alone).length, 1)
  const excluded = withFinals({ startDate: '2026-11-11', endDate: '2026-11-11', noClassDates: ['2026-11-11'] })
  assert.equal(excluded.eventCount, 1)
  assert.equal(excluded.skippedCount, 1)
  assert.equal(examEvents(excluded).length, 1)
})

test('valid midnight-hour final times remain timed events and weekly closures do not suppress confirmed finals', () => {
  const result = withFinals({ noClassDates: ['2026-12-08'], finals: [final({ beginTime: '00:00:00', endTime: '00:30:00' })] })
  const exam = examEvents(result)[0]
  assert.equal(exam.start.dateTime, '2026-12-08T00:00:00')
  assert.equal(exam.end.dateTime, '2026-12-08T00:30:00')
  assert.equal('recurrence' in exam, false)
  assert.equal('date' in exam.start, false)
})

test('Winter finals on spring-DST Sunday reject nonexistent starts or ends while valid post-change times remain scheduled', () => {
  const metadata = getAcademicCalendar('20271')
  for (const [beginTime, endTime] of [['02:30', '03:30'], ['01:30', '02:30']]) {
    const result = calendar({
      ...metadata, quarter: '20271',
      finals: [final({ examDate: '2027-03-14', beginTime, endTime })]
    })
    assert.deepEqual(result.unavailableFinals, ['CMPSC 16'])
    assert.equal(examEvents(result).length, 0)
    assert.equal(result.eventCount, 1)
    assert.equal(result.skippedCount, 0)
  }
  const result = calendar({
    ...metadata, quarter: '20271',
    finals: [final({ examDate: '2027-03-14', beginTime: '03:00', endTime: '04:00' })]
  })
  assert.deepEqual(result.unavailableFinals, [])
  assert.deepEqual(examEvents(result)[0].start, { dateTime: '2027-03-14T03:00:00', timeZone: 'America/Los_Angeles' })
  assert.deepEqual(examEvents(result)[0].end, { dateTime: '2027-03-14T04:00:00', timeZone: 'America/Los_Angeles' })
  assert.equal('recurrence' in examEvents(result)[0], false)
})

test('existing callers receive empty final warnings without changing their weekly event count', () => {
  const result = calendar()
  assert.deepEqual(result.unavailableFinals, [])
  assert.equal(result.eventCount, 1)
  assert.equal(result.skippedCount, 0)
})
