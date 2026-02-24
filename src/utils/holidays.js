const getHolidays = (year) => {
  function nthWeekdayOfMonth(n, weekday, month) {
    const firstDayOfMonth = new Date(year, month, 1);
    const firstWeekday = firstDayOfMonth.getDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }

  const getMemorialDay = () => {
    const lastDayOfMay = new Date(year, 4, 31);
    const lastWeekday = lastDayOfMay.getDay();
    const offset = (lastWeekday - 1 + 7) % 7;
    return new Date(year, 4, 31 - offset);
  }

  const dateRange = (startMonth, startDay, endMonth, endDay, endYear = year) => {
    const dates = [];
    const end = new Date(endYear, endMonth, endDay);
    for (let d = new Date(year, startMonth, startDay); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }

  const date = (month, day) => {
    return [new Date(year, month, day)];
  }

  return new Map([
    ["Veterans Day", date(10, 11)],
    ["Thanksgiving", (() => { const t = nthWeekdayOfMonth(4, 4, 10); return [t, new Date(year, 10, t.getDate() + 1)]; })()],
    ["Christmas", dateRange(11, 24, 11, 25)],
    ["New Years", dateRange(11, 31, 0, 1, year + 1)],
    ["Winter Break", dateRange(11, 13, 0, 4, year + 1)],
    ["M.L.K. Jr. Day", date(0, nthWeekdayOfMonth(3, 1, 0).getDate())],
    ["Presidents Day", date(1, nthWeekdayOfMonth(3, 1, 1).getDate())],
    ["Cesar Chavez Day", date(2, 27)],
    ["Spring Break", dateRange(2, 21, 2, 29)],
    ["Memorial Day", [getMemorialDay()]],
    ["Juneteenth", date(5, 19)],
    ["Independence Day", dateRange(6, 3, 6, 4)],
    ["Labor Day", date(8, nthWeekdayOfMonth(1, 1, 8).getDate())],
  ]);
}
