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
  assert.equal(getTodayHoliday(campusDate), 'Independence Day')
})
