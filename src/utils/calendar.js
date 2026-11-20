const DAY = 86400000
const encoder = new TextEncoder()

function parseDate (value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

export function normalizeClassDate (value) {
  if (typeof value !== 'string') return ''
  const iso = value.match(/^\d{4}-\d{2}-\d{2}(?=$|T|\s)/)?.[0]
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const result = iso || (us ? `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}` : '')
  return parseDate(result) ? result : ''
}

export function sessionDateRange (session, quarter) {
  const match = session.match(/\((.*?)\s+-\s+(.*?)\)/)
  const normalize = value => normalizeClassDate(/^\d{1,2}\/\d{1,2}$/.test(value) ? `${value}/${quarter.slice(0, 4)}` : value)
  return {
    startDate: match ? normalize(match[1]) : '',
    endDate: match ? normalize(match[2]) : ''
  }
}

export function isTimedPiece (piece) {
  const w = piece?.wTime
  return Array.isArray(w) && w.length === 2 && w.every(Number.isInteger) &&
    w[0] >= 0 && w[0] < 7 * 1440 && w[1] > w[0] &&
    w[1] <= (Math.floor(w[0] / 1440) + 1) * 1440
}

function escapeText (value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

function foldLine (line) {
  let result = '', bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 75) {
      result += '\r\n '
      bytes = 1
    }
    result += char
    bytes += size
  }
  return result
}

function dateTime (date, minutes) {
  const value = new Date(date.getTime() + minutes * 60000)
  return value.toISOString().replace(/[-:]/g, '').slice(0, 15)
}

function googleTime (value) {
  return {
    dateTime: value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3T$4:$5:$6'),
    timeZone: 'America/Los_Angeles'
  }
}

function daylightBounds (year) {
  const march = new Date(Date.UTC(year, 2, 8))
  const november = new Date(Date.UTC(year, 10, 1))
  return [
    march.getTime() + (7 - march.getUTCDay()) % 7 * DAY,
    november.getTime() + (7 - november.getUTCDay()) % 7 * DAY
  ]
}

function endOfPacificDay (date) {
  const [spring, fall] = daylightBounds(date.getUTCFullYear())
  const offset = date >= spring && date < fall ? 7 : 8
  return new Date(date.getTime() + DAY - 1000 + offset * 3600000)
    .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Stable across downloads, while keeping lecture, section and custom meetings distinct.
function uid (quarter, piece) {
  const identity = JSON.stringify([piece.key, piece.section || '', piece.session || '', piece.title || '', piece.location || '', piece.wTime])
  return `${quarter}-${encodeURIComponent(identity)}@gogaucho.app`
}

function validateRange (startDate, endDate) {
  const start = parseDate(startDate), end = parseDate(endDate)
  if (!start || !end) throw new Error('Enter valid first and last class dates.')
  if (start > end) throw new Error('The last class date must be on or after the first class date.')
  if (start.getUTCFullYear() < 2007) throw new Error('Calendar export supports class dates from 2007 onward.')
  return [start, end]
}

export function createCalendar ({ quarter, pieces, startDate, endDate, sessionRanges = {}, noClassDates = [], finals = [], finalsEndDate = '', now = new Date() }) {
  if (!/^\d{4}[1-4]$/.test(quarter || '')) throw new Error('Select a quarter before exporting.')
  const [start, end] = validateRange(startDate, endDate)
  if (!Array.isArray(noClassDates) || noClassDates.some(date => !parseDate(date))) throw new Error('Official no-class dates are invalid.')
  if (!Array.isArray(finals)) throw new Error('Final-exam information is invalid.')
  const closures = new Set(noClassDates)
  const finalEnd = parseDate(finalsEndDate)
  const unavailableFinals = new Set()
  const ranges = new Map()
  for (const piece of pieces.filter(isTimedPiece)) {
    if (quarter.endsWith('3') && piece.key !== 'custom' && !piece.session) {
      throw new Error('A summer class is missing its session.')
    }
    if (!piece.session || ranges.has(piece.session)) continue
    const range = sessionRanges[piece.session]
    if (!range) throw new Error(`Enter the class dates for ${piece.session}.`)
    let dates
    try {
      dates = validateRange(range.startDate, range.endDate)
    } catch (error) {
      throw new Error(`${piece.session}: ${error.message}`)
    }
    if (dates[0] < start || dates[1] > end) throw new Error(`${piece.session}: session dates must fall within the overall class dates.`)
    ranges.set(piece.session, dates)
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GoGaucho//Class Schedule//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText('GoGaucho ' + quarter)}`,
    'X-WR-TIMEZONE:America/Los_Angeles',
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'BEGIN:DAYLIGHT',
    'DTSTART:20070311T020000',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'DTSTART:20071104T020000',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ]
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const seen = new Set()
  const events = []
  let eventCount = 0, skippedCount = 0
  for (const piece of pieces) {
    if (!isTimedPiece(piece)) {
      skippedCount++
      continue
    }
    const [first, last] = ranges.get(piece.session) || [start, end]
    const weekday = Math.floor(piece.wTime[0] / 1440)
    const offset = (weekday - (first.getUTCDay() + 6) % 7 + 7) % 7
    let date = new Date(first.getTime() + offset * DAY)
    const minutes = piece.wTime[0] % 1440
    const isClosed = day => piece.key !== 'custom' && closures.has(day.toISOString().slice(0, 10))
    const isGap = day => day.getTime() === daylightBounds(day.getUTCFullYear())[0] && weekday === 6 && minutes >= 120 && minutes < 180
    // Anchor on an actual class, including when the first week is a closure.
    while (date <= last && (isClosed(date) || isGap(date))) {
      date = new Date(date.getTime() + 7 * DAY)
    }
    if (date > last) {
      skippedCount++
      continue
    }
    // DTEND makes recurring events keep an exact elapsed duration. Reject a
    // clock-change crossing rather than silently move the displayed end time.
    if (weekday === 6 && minutes < 120 && minutes + piece.wTime[1] - piece.wTime[0] >= 120) {
      for (let year = date.getUTCFullYear(); year <= last.getUTCFullYear(); year++) {
        if (daylightBounds(year).some(day => day >= date && day <= last && !isClosed(new Date(day)))) {
          throw new Error(`${piece.title || piece.key}: this overnight meeting crosses a daylight-saving time change. Choose a date range excluding that day and add that occurrence separately in your calendar.`)
        }
      }
    }
    const id = uid(quarter, piece)
    if (seen.has(id)) continue
    seen.add(id)
    const description = [piece.key, piece.section && `Section ${piece.section}`, piece.session].filter(Boolean).join('\n')
    const startTime = dateTime(date, minutes)
    const endTime = dateTime(date, minutes + piece.wTime[1] - piece.wTime[0])
    const recurrence = `RRULE:FREQ=WEEKLY;UNTIL=${endOfPacificDay(last)}`
    const excluded = piece.key === 'custom' ? [] : [...closures].sort().map(parseDate).filter(day =>
      day >= date && day <= last && (day.getUTCDay() + 6) % 7 === weekday && !isGap(day)
    ).map(day => dateTime(day, minutes))
    const recurrenceRules = [recurrence]
    if (excluded.length) recurrenceRules.push(`EXDATE;TZID=America/Los_Angeles:${excluded.join(',')}`)
    events.push({
      summary: piece.title || piece.key,
      location: piece.location || '',
      description,
      start: googleTime(startTime),
      end: googleTime(endTime),
      recurrence: recurrenceRules,
      visibility: 'private'
    })
    lines.push(
      'BEGIN:VEVENT',
      `UID:${id}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Los_Angeles:${startTime}`,
      `DTEND;TZID=America/Los_Angeles:${endTime}`,
      ...recurrenceRules,
      `SUMMARY:${escapeText(piece.title || piece.key)}`,
      `LOCATION:${escapeText(piece.location)}`,
      `DESCRIPTION:${escapeText(description)}`,
      'END:VEVENT'
    )
    eventCount++
  }
  const examTime = value => {
    const match = typeof value === 'string' && value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/)
    return match ? Number(match[1]) * 60 + Number(match[2]) : null
  }
  for (const exam of finals) {
    if (!exam || typeof exam.courseKey !== 'string' || !exam.courseKey.trim() || typeof exam.hasFinals !== 'boolean') {
      throw new Error('Final-exam information is invalid.')
    }
    if (!exam.hasFinals) continue
    const course = exam.courseKey.trim()
    const day = parseDate(normalizeClassDate(exam.examDate))
    const begin = examTime(exam.beginTime), finish = examTime(exam.endTime)
    const springGap = day && day.getTime() === daylightBounds(day.getUTCFullYear())[0] &&
      [begin, finish].some(minutes => minutes >= 120 && minutes < 180)
    if (!day || !finalEnd || finalEnd < end || day < start || day > finalEnd || begin === null || finish === null || finish <= begin || springGap) {
      unavailableFinals.add(course)
      continue
    }
    const identity = `${quarter}-final-${encodeURIComponent(JSON.stringify([course, day.toISOString().slice(0, 10), begin, finish]))}@gogaucho.app`
    if (seen.has(identity)) continue
    seen.add(identity)
    const summary = `${course} Final`
    const description = [course, typeof exam.comments === 'string' && exam.comments].filter(Boolean).join('\n')
    const location = typeof exam.location === 'string' ? exam.location : ''
    const startTime = dateTime(day, begin), endTime = dateTime(day, finish)
    events.push({ summary, description, location, start: googleTime(startTime), end: googleTime(endTime), visibility: 'private' })
    lines.push(
      'BEGIN:VEVENT', `UID:${identity}`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Los_Angeles:${startTime}`, `DTEND;TZID=America/Los_Angeles:${endTime}`,
      `SUMMARY:${escapeText(summary)}`, `LOCATION:${escapeText(location)}`, `DESCRIPTION:${escapeText(description)}`, 'END:VEVENT'
    )
    eventCount++
  }
  if (!eventCount) throw new Error('No scheduled meetings fall within these dates. Check your class and session dates.')
  lines.push('END:VCALENDAR')
  return { content: lines.map(foldLine).join('\r\n') + '\r\n', eventCount, skippedCount, events, unavailableFinals: [...unavailableFinals] }
}
