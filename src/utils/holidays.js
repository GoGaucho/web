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

const getHolidays = (year) => {
  function nthWeekdayOfMonth(n, weekday, month) {
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const firstWeekday = firstDayOfMonth.getUTCDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7));
  }

  const getMemorialDay = () => {
    const lastDayOfMay = new Date(Date.UTC(year, 4, 31));
    const lastWeekday = lastDayOfMay.getUTCDay();
    const offset = (lastWeekday - 1 + 7) % 7;
    return new Date(Date.UTC(year, 4, 31 - offset));
  }

  const dateRange = (startMonth, startDay, endMonth, endDay) => {
    const dates = [];
    const end = new Date(Date.UTC(year, endMonth, endDay));
    for (let d = new Date(Date.UTC(year, startMonth, startDay)); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }

  const date = (month, day) => {
    return [new Date(Date.UTC(year, month, day))];
  }

  const fmt = (d) => d.toISOString().slice(0, 10);

  return new Map([
    ["Veterans Day", date(10, 11).map(fmt)],
    ["Thanksgiving", (() => { const t = nthWeekdayOfMonth(4, 4, 10); return [t, new Date(Date.UTC(year, 10, t.getUTCDate() + 1))]; })().map(fmt)],
    ["Christmas", dateRange(11, 24, 11, 25).map(fmt)],
    ["New Years", [...date(11, 31), ...date(0, 1)].map(fmt)],
    ["Winter Break", [...dateRange(11, 13, 11, 31), ...dateRange(0, 1, 0, 4)].map(fmt)],
    ["M.L.K. Jr. Day", date(0, nthWeekdayOfMonth(3, 1, 0).getUTCDate()).map(fmt)],
    ["Presidents Day", date(1, nthWeekdayOfMonth(3, 1, 1).getUTCDate()).map(fmt)],
    ["Cesar Chavez Day", date(2, 27).map(fmt)],
    ["Spring Break", dateRange(2, 21, 2, 29).map(fmt)],
    ["Memorial Day", [getMemorialDay()].map(fmt)],
    ["Juneteenth", date(5, 19).map(fmt)],
    ["Independence Day", dateRange(6, 3, 6, 4).map(fmt)],
    ["Labor Day", date(8, nthWeekdayOfMonth(1, 1, 8).getUTCDate()).map(fmt)],
  ]);
}

export const getTodayHoliday = (campusDate = getCampusDate()) => {
  const today = campusDate.toISOString().slice(0, 10);
  const holidays = getHolidays(campusDate.getUTCFullYear());
  for (const [name, dates] of holidays) {
    if (dates.includes(today)) {
      return name;
    }
  }
  return null;
}
