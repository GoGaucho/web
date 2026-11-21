export function enrolledLecture(course, periods = []) {
  const lectures = Object.entries(course?.tree ?? {});
  const codes = periods.map(period => period.sectionCode).filter(code => /^\d{5}$/.test(code));
  const enrolled = lectures.filter(([lecture, sections]) =>
    codes.some(code => code === lecture || sections.includes(code)),
  );
  if (enrolled.length) return enrolled.length === 1 ? enrolled[0][0] : undefined;
  if (lectures.length === 1) return lectures[0][0];

  // Older schedule periods can have a four-digit section number instead of an enrollment code.
  const normalize = value => value?.replace(/\s+/g, "").toUpperCase();
  let candidates = lectures;
  for (const period of periods) {
    if (!period.time || !period.location) continue;
    const matches = lectures.filter(([lecture, sections]) =>
      [lecture, ...sections].some(code => course.sections?.[code]?.periods?.some(meeting =>
        normalize(meeting.time) === normalize(period.time) &&
        normalize(meeting.location) === normalize(period.location),
      )),
    );
    if (matches.length) candidates = candidates.filter(candidate => matches.includes(candidate));
  }
  if (candidates.length === 1) return candidates[0][0];
}
