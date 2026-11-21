const examDate = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});
// Keep campus wall-clock times fixed across viewer time zones.
const examTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
});

export function formatFinal({ examDate: date, beginTime, endTime }) {
  const [year, month, day] = date?.match(/^(\d{4})(\d{2})(\d{2})$/)?.slice(1) ?? [];
  const dateLabel = year ? examDate.format(Date.UTC(year, month - 1, day)) : date;
  const timeLabel = [beginTime, endTime].filter(Boolean).map(time => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return time;
    return examTime.format(Date.parse(`2000-01-01T${time}:00Z`)).replace(/[\u202f\u00a0]/g, " ");
  }).join(" - ");
  return [dateLabel, timeLabel].filter(Boolean).join(", ");
}
