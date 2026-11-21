import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { normalizeClassDate } from '../src/utils/calendar.js'

const source = 'https://registrar.sa.ucsb.edu/calendars/academic-calendars'
const snapshotPath = new URL('../src/data/academic-calendar.json', import.meta.url)
const publishedSnapshot = 'https://firebase-gogaucho.web.app/academic-calendar.json'
const day = 86400000
const terms = [['Fall', 4], ['Winter', 1], ['Spring', 2]]
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

async function request (url, options) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), ...options })
  if (!response.ok) throw new Error(`Calendar request to ${new URL(url).hostname} returned HTTP ${response.status}.`)
  return response
}

function parseRange (value) {
  const dates = value?.trim().split(/\s+[-–]\s+/).map(part => {
    const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(part)
    if (!match || !months.includes(match[1])) throw new Error(`Unexpected Registrar date: ${part}`)
    return normalizeClassDate(`${months.indexOf(match[1]) + 1}/${match[2]}/${match[3]}`)
  })
  const [start, end = start] = dates || []
  if (!start || !end || dates.length > 2 || end < start) throw new Error(`Invalid Registrar date range: ${value}`)
  return [start, end]
}

// Power BI uses dictionary indexes and bit masks for repeated and null values.
function readRows (result, columns) {
  const dataset = result?.result?.data?.dsr?.DS?.[0]
  const rows = dataset?.PH?.[0]?.DM0
  if (!rows?.length) throw new Error('The Registrar report returned no rows.')
  let previous = [], schema
  return rows.map(row => {
    schema = row.S || schema
    if (!schema || schema.length < columns) throw new Error('The Registrar report columns changed.')
    let index = 0
    const values = schema.map((column, position) => {
      if ((row.R || 0) & (1 << position)) return previous[position]
      if ((row['Ø'] || 0) & (1 << position)) return null
      const value = row.C ? row.C[index++] : row[column.N]
      return column.DN ? dataset.ValueDicts[column.DN]?.[value] : value
    })
    previous = values
    return values.slice(0, columns)
  })
}

function noClassesWithin (holidays, start, end) {
  const dates = new Set()
  for (const [first, last] of holidays) {
    for (let time = Date.parse(first > start ? first : start), stop = Date.parse(last < end ? last : end); time <= stop; time += day) {
      dates.add(new Date(time).toISOString().slice(0, 10))
    }
  }
  return [...dates].sort()
}

function instructionalDays (start, end, holidays) {
  let count = 0
  for (let time = Date.parse(start); time <= Date.parse(end); time += day) {
    const date = new Date(time)
    if (date.getUTCDay() % 6 !== 0 && !holidays.includes(date.toISOString().slice(0, 10))) count++
  }
  return count
}

async function readSnapshot () {
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'))
  if (!process.argv.includes('--hosting')) return snapshot
  const response = await fetch(publishedSnapshot, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
  // The first deployment with the snapshot has no previous file to merge.
  if (response.status === 404) return snapshot
  if (!response.ok) throw new Error(`Published snapshot returned HTTP ${response.status}.`)
  const previous = await response.json()
  if (!previous || Array.isArray(previous) || typeof previous !== 'object' || !Object.keys(previous).length) {
    throw new Error('The published calendar snapshot is invalid.')
  }
  for (const [quarter, dates] of Object.entries(previous)) {
    const { startDate, endDate, finalsStartDate, finalsEndDate, noClassDates } = dates || {}
    const valid = value => Boolean(value) && normalizeClassDate(value) === value
    if (!/^\d{4}[124]$/.test(quarter) || ![startDate, endDate, finalsStartDate, finalsEndDate].every(valid) ||
      !(startDate < endDate && endDate < finalsStartDate && finalsStartDate <= finalsEndDate) ||
      !Array.isArray(noClassDates) || !noClassDates.length || !noClassDates.every(date => valid(date) && startDate <= date && date <= endDate)) {
      throw new Error(`Invalid published calendar for ${quarter}.`)
    }
    snapshot[quarter] = { startDate, endDate, finalsStartDate, finalsEndDate, noClassDates }
  }
  return snapshot
}

async function writeSnapshot (snapshot) {
  const temporaryPath = new URL(`academic-calendar-${randomUUID()}.tmp`, snapshotPath)
  try {
    await writeFile(temporaryPath, JSON.stringify(snapshot, null, 2) + '\n')
    await rename(temporaryPath, snapshotPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

const snapshot = await readSnapshot()
if (process.argv.includes('--cached-only')) {
  await writeSnapshot(snapshot)
  console.log('Retained the last verified calendar snapshot.')
  process.exit(0)
}

const page = await (await request(source)).text()
const reportUrl = page.match(/https:\/\/app\.powerbi\.com\/view\?r=[A-Za-z0-9_+=%/-]+/)?.[0]
if (!reportUrl) throw new Error('The Registrar report link changed.')
const { k: reportId } = JSON.parse(Buffer.from(new URL(reportUrl).searchParams.get('r'), 'base64').toString())
if (!/^[a-f0-9-]{36}$/i.test(reportId)) throw new Error('The Registrar report identifier changed.')
const embed = await (await request(reportUrl)).text()
const cluster = embed.match(/var resolvedClusterUri = '([^']+)'/)?.[1]
if (!cluster) throw new Error('The published report cluster could not be located.')
const host = new URL(cluster)
if (host.protocol !== 'https:' || !/^[a-z0-9-]+\.analysis\.windows\.net$/.test(host.hostname)) throw new Error('Unexpected Power BI host.')
host.hostname = host.hostname.replace('-redirect', '').replace(/^global-/, '').replace('.analysis.', '-api.analysis.')
const headers = { Accept: 'application/json', 'X-PowerBI-ResourceKey': reportId, ActivityId: randomUUID() }
const model = await (await request(new URL(`/public/reports/${reportId}/modelsAndExploration?preferReadOnlySession=true`, host), {
  headers: { ...headers, RequestId: randomUUID() }
})).json()
const modelId = model.models?.[0]?.id
if (!modelId) throw new Error('The Registrar report model changed.')
const visuals = model.exploration.sections.flatMap(section => section.visualContainers)
  .filter(visual => visual.query).map(visual => JSON.parse(visual.query))
const select = query => query.Commands?.[0]?.SemanticQueryDataShapeCommand?.Query

function reportQuery (columns, year) {
  const visual = visuals.find(query => columns.every((column, index) => select(query)?.Select[index]?.Name === column) &&
    (columns[0] !== 'Holidays.Holiday' || select(query).Select.length === columns.length))
  if (!visual) throw new Error(`Missing Registrar report table for ${columns[0]}.`)
  const query = structuredClone(visual)
  const selection = select(query)
  if (year) {
    const yearFilter = selection.Where?.find(filter => filter.Condition?.In?.Expressions?.[0]?.Column?.Property === 'Academic Year')
    if (!yearFilter) throw new Error('The Registrar academic year filter changed.')
    yearFilter.Condition.In.Values = [[{ Literal: { Value: `'${year}'` } }]]
    selection.Where = [yearFilter]
  } else selection.Where = []
  return { Query: query }
}

async function queryReport (queries) {
  const response = await (await request(new URL('/public/reports/querydata', host), {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', RequestId: randomUUID() },
    body: JSON.stringify({ version: '1.0.0', queries, cancelQueries: [], modelId })
  })).json()
  if (response.results?.length !== queries.length) throw new Error('The Registrar returned incomplete query results.')
  return response.results
}

const [yearResult] = await queryReport([reportQuery(['Calendar.Academic Year'])])
const yearRows = readRows(yearResult, 1).map(([year]) => year)
const years = [...new Set(yearRows.filter(year => /^\d{4}-\d{4}$/.test(year) && Number(year.slice(0, 4)) >= 2026 &&
  Number(year.slice(0, 4)) + 1 === Number(year.slice(5))))].sort()
if (!years.length) throw new Error('The Registrar report returned no supported academic years.')

for (const year of years) {
  const [holidayResult, quarterResult] = await queryReport([
    reportQuery(['Holidays.Holiday', 'Holidays.Quarter Name', 'Holidays.date'], year),
    reportQuery(['Calendar.Event', 'Calendar.Fall Quarter', 'Calendar.Winter Quarter', 'Calendar.Spring Quarter'], year)
  ])
  const holidays = readRows(holidayResult, 3).map(([, , dates]) => parseRange(dates))
  const quarterRows = readRows(quarterResult, 4)
  const row = label => {
    const matches = quarterRows.filter(([name]) => name === label)
    if (matches.length !== 1) throw new Error(`Expected one ${label} row for ${year}.`)
    return matches[0]
  }
  const names = row('Quarter Name'), instruction = row('Instruction'), finals = row('Finals'), weekdays = row('Days of Instruction')
  for (const [index, [term, code]] of terms.entries()) {
    const yearNumber = year.split('-')[code === 4 ? 0 : 1]
    const column = index + 1
    if (names[column] !== `${term.toUpperCase()} ${yearNumber}`) throw new Error(`Unexpected ${term} column for ${year}.`)
    const [startDate, endDate] = parseRange(instruction[column])
    const [finalsStartDate, finalsEndDate] = parseRange(finals[column])
    if (!startDate.startsWith(yearNumber) || !finalsEndDate.startsWith(yearNumber) || startDate >= endDate ||
      endDate >= finalsStartDate || Date.parse(finalsEndDate) - Date.parse(startDate) > 100 * day) {
      throw new Error(`Inconsistent ${term} calendar dates for ${year}.`)
    }
    const noClassDates = noClassesWithin(holidays, startDate, endDate)
    const publishedDays = /^([0-9]+) days?$/i.exec(weekdays[column])?.[1]
    if (!noClassDates.length || instructionalDays(startDate, endDate, noClassDates) !== Number(publishedDays)) {
      throw new Error(`Holiday data does not match the Registrar’s instruction day count for ${term} ${yearNumber}.`)
    }
    snapshot[yearNumber + code] = { startDate, endDate, finalsStartDate, finalsEndDate, noClassDates }
  }
}

await writeSnapshot(snapshot)
console.log(`Refreshed UCSB academic dates for ${years.join(', ')}.`)
