import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCampusDate, getTodayHoliday } from '../src/utils/holidays.js'

test('Thanksgiving ends at UCSB midnight for a user in New York', () => {
  process.env.TZ = 'America/New_York'
  const lateFriday = new Date('2026-11-28T01:00:00-05:00')
  const campusFriday = getCampusDate(lateFriday)

  assert.equal(lateFriday.getDay(), 6)
  assert.equal(campusFriday.getUTCDay(), 5)
  assert.equal(campusFriday.getUTCHours(), 22)
  assert.equal(getTodayHoliday(campusFriday), 'Thanksgiving')

  const campusSaturday = getCampusDate(new Date('2026-11-28T03:00:00-05:00'))
  assert.equal(campusSaturday.getUTCDay(), 6)
  assert.equal(campusSaturday.getUTCHours(), 0)
  assert.equal(getTodayHoliday(campusSaturday), null)
})

test('Campus clock observes daylight saving time and holiday dates ignore the device zone', () => {
  process.env.TZ = 'Asia/Tokyo'
  const campusDate = getCampusDate(new Date('2026-07-04T07:30:00Z'))

  assert.equal(campusDate.toISOString(), '2026-07-04T00:30:00.000Z')
  assert.equal(getTodayHoliday(campusDate), null)
})

test('Holiday and break dates follow the UCSB academic calendar', () => {
  const cases = [
    ['2026-07-03', 'Independence Day'],
    ['2026-11-25', null],
    ['2026-12-11', null],
    ['2026-12-12', 'Winter Break'],
    ['2026-12-24', 'Christmas'],
    ['2026-12-31', 'New Year'],
    ['2027-01-01', 'New Year'],
    ['2027-01-03', 'Winter Break'],
    ['2027-01-04', null],
    ['2027-03-19', null],
    ['2027-03-20', 'Spring Break'],
    ['2027-03-26', 'Farmworkers Day'],
    ['2027-03-28', 'Spring Break'],
    ['2027-03-29', null],
    ['2027-06-18', 'Juneteenth'],
    ['2027-06-19', null],
    ['2027-07-03', null],
    ['2027-07-04', null],
    ['2027-07-05', 'Independence Day'],
    ['2027-07-06', null]
  ]

  for (const [date, expected] of cases) {
    const campusDate = getCampusDate(new Date(date + 'T20:00:00Z'))
    assert.equal(getTodayHoliday(campusDate), expected, date)
  }
})
