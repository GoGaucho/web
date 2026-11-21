import quarters from '../data/academic-calendar.json' with { type: 'json' }

const sourceUrl = 'https://registrar.sa.ucsb.edu/calendars/academic-calendars'

export function getAcademicCalendar (quarter) {
  if (typeof quarter !== 'string' || !Object.hasOwn(quarters, quarter)) return null
  const dates = quarters[quarter]
  const year = Number(quarter.slice(0, 4))
  const fallYear = quarter.endsWith('4') ? year : year - 1
  return { ...dates, noClassDates: [...dates.noClassDates], academicYear: `${fallYear}-${fallYear + 1}`, sourceUrl }
}
