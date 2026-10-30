// A missing meal is not evidence that a dining common is closed.
export function selectDiningMeal(meals, selected, menuDate, now = new Date()) {
  const available = Object.keys(meals || {}).filter(name => meals[name])
  if (available.includes(selected)) return selected
  if (!available.length) return ''

  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(part => [part.type, part.value]))
  const today = `${parts.year}-${parts.month}-${parts.day}`
  if (menuDate !== today) return available[0]

  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  return available.find(name => {
    const end = meals[name].hour?.match(/-\s*(\d{1,2}):(\d{2})\s*([AP])M\s*$/i)
    if (!end) return true
    const hour = Number(end[1]) % 12 + (end[3].toUpperCase() === 'P' ? 12 : 0)
    return hour * 60 + Number(end[2]) > minutes
  }) || available[available.length - 1]
}
