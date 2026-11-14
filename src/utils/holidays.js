const campusClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hourCycle: 'h23'
})

// Store campus clock fields in a Date for calendar arithmetic with UTC getters.
export function getCampusDate (now = new Date()) {
  const { year, month, day, hour, minute, second } = Object.fromEntries(
    campusClock.formatToParts(now).map(({ type, value }) => [type, Number(value)])
  )
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
}

// https://catalog.ucsb.edu/academicsandpolicies/introcampus/calendar
// https://career.ucsb.edu/recruiters/recruitment-calendar
// https://ccs.ucsb.edu/sites/default/files/documents/StudentHandbook2025-26_6.pdf
const holidays = new Map([
  ['2025-11-11', 'Veterans Day'],
  ['2025-11-27', 'Thanksgiving'],
  ['2025-11-28', 'Thanksgiving'],
  ['2025-12-24', 'Christmas'],
  ['2025-12-25', 'Christmas'],
  ['2025-12-31', 'New Year'],
  ['2026-01-01', 'New Year'],
  ['2026-01-19', 'Martin Luther King Jr. Day'],
  ['2026-02-16', 'Presidents Day'],
  ['2026-03-27', 'Cesar Chavez Day'],
  ['2026-05-25', 'Memorial Day'],
  ['2026-06-19', 'Juneteenth'],
  ['2026-07-03', 'Independence Day'],
  ['2026-09-07', 'Labor Day'],
  ['2026-11-11', 'Veterans Day'],
  ['2026-11-26', 'Thanksgiving'],
  ['2026-11-27', 'Thanksgiving'],
  ['2026-12-24', 'Christmas'],
  ['2026-12-25', 'Christmas'],
  ['2026-12-31', 'New Year'],
  ['2027-01-01', 'New Year'],
  ['2027-01-18', 'Martin Luther King Jr. Day'],
  ['2027-02-15', 'Presidents Day'],
  ['2027-03-26', 'Farmworkers Day'],
  ['2027-05-31', 'Memorial Day'],
  ['2027-06-18', 'Juneteenth'],
  ['2027-07-05', 'Independence Day'],
  ['2027-09-06', 'Labor Day']
])

const breaks = [
  ['2025-12-13', '2026-01-04', 'Winter Break'],
  ['2026-03-21', '2026-03-29', 'Spring Break'],
  ['2026-12-12', '2027-01-03', 'Winter Break'],
  ['2027-03-20', '2027-03-28', 'Spring Break']
]

// shortcut: Dates are maintained in source through summer 2027, extend from the published UCSB calendar for later terms.
export const getTodayHoliday = (campusDate = getCampusDate()) => {
  const today = campusDate.toISOString().slice(0, 10)
  return holidays.get(today) ??
    breaks.find(([start, end]) => today >= start && today <= end)?.[2] ??
    null
}
