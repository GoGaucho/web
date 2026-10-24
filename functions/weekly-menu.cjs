const { load } = require('cheerio')

const diningCommons = new Set(['carrillo', 'de-la-guerra', 'ortega', 'portola'])
const cache = new Map()

function parseWeeklyMenu(html) {
  const $ = load(html)
  const days = new Map()
  $('[id$="-body"] table').each((_, table) => {
    const meal = $(table).parent().attr('id').replace(/-body$/, '')
    const dates = $(table).find('thead th h4').map((_, el) => $(el).text().trim()).get()
    dates.forEach(date => {
      if (!days.has(date)) days.set(date, { date, meals: {} })
    })
    let station = ''
    $(table).find('tbody tr').each((_, row) => {
      const heading = $(row).find('.course-row')
      if (heading.length) {
        station = heading.text().trim()
        return
      }
      if (!station) return
      $(row).children('td').each((index, cell) => {
        const items = $(cell).find('dd').map((_, item) => $(item).text().trim()).get().filter(Boolean)
        if (!items.length || !dates[index]) return
        const day = days.get(dates[index])
        if (!day.meals[meal]) day.meals[meal] = {}
        day.meals[meal][station] = [...(day.meals[meal][station] || []), ...items]
      })
    })
  })
  if (!days.size) throw new Error('Unrecognized weekly menu format')
  return [...days.values()]
}

async function weeklyMenuHandler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }
  const dc = new URL(req.url, 'http://localhost').searchParams.get('dc') || 'carrillo'
  if (!diningCommons.has(dc)) {
    res.statusCode = 400
    return res.end(JSON.stringify({ error: 'Invalid dining common' }))
  }
  try {
    let entry = cache.get(dc)
    if (!entry || entry.expires < Date.now()) {
      const source = `https://apps.dining.ucsb.edu/menu/week?dc=${dc}`
      const response = await fetch(source, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error(`Menu source returned ${response.status}`)
      entry = { expires: Date.now() + 300000, data: { days: parseWeeklyMenu(await response.text()), source } }
      cache.set(dc, entry)
    }
    // Cache in memory only, so dates cannot remain stale in a browser overnight.
    res.setHeader('Cache-Control', 'no-store')
    return res.end(JSON.stringify(entry.data))
  } catch (error) {
    console.error('Weekly dining menu:', error.message)
    res.statusCode = 502
    return res.end(JSON.stringify({ error: 'Weekly menus are temporarily unavailable. Please try again or visit UCSB’s menu.' }))
  }
}

module.exports = { parseWeeklyMenu, weeklyMenuHandler }
