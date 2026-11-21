import quarters from '../data/academic-calendar.json' with { type: 'json' }
import summerSessions from '../data/summer-sessions.json' with { type: 'json' }
import { isTimedPiece, sessionDateRange } from './calendar.js'

const sourceUrl = 'https://registrar.sa.ucsb.edu/calendars/academic-calendars'

export function getAcademicCalendar (quarter) {
  if (typeof quarter !== 'string' || !Object.hasOwn(quarters, quarter)) return null
  const dates = quarters[quarter]
  const year = Number(quarter.slice(0, 4))
  const fallYear = quarter.endsWith('4') ? year : year - 1
  return { ...dates, noClassDates: [...dates.noClassDates], academicYear: `${fallYear}-${fallYear + 1}`, sourceUrl }
}

// Class schedules can include a session name alone or a name followed by dates.
function sessionRange (label, quarter) {
  if (typeof label !== 'string') return undefined
  const summer = summerSessions[quarter]
  if (!summer) return sessionDateRange(label, quarter)
  const match = /^(?:(?:session|sess\.?)\s+)?([A-G])(?:\s*\([^()]+\))?$/i.exec(label.trim())
  return match ? { ...summer[match[1].toUpperCase()] } : undefined
}

export function getScheduleCalendar (quarter, pieces) {
  const dates = getAcademicCalendar(quarter)
  if (!dates) return null
  const sessions = new Set(pieces.filter(isTimedPiece).map(piece => piece.session).filter(Boolean))
  const sessionRanges = Object.fromEntries([...sessions].map(label => [label, sessionRange(label, quarter)]))
  return { ...dates, sessionRanges }
}
