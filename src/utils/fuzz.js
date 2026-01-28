export const courseFuseOptions = {
    shouldSort: true,
    includeMatches: false,
    threshold: 0.25,
    keys: [
        "id",
        "name",
        "subject"
    ]
};
// in case fuzzy needed elsewhere, put separate configs below


export function fuzzyQuery(query, fuseObj, list) {
    if (!query) return list
    if (!fuseObj) return list

    const normalized = query.replaceAll(' ', '').toUpperCase()

    // Substring search first
    const substringMatches = list.filter(item =>
        item.id?.includes(normalized) || item.name?.toUpperCase().includes(normalized)
    )

    if (substringMatches.length > 0) return substringMatches

    // Corrections after using fuzzy match
    return fuseObj.search(query).map(r => r.item)
}

// Flattens course data specifically for fuzzy searchability
export function flattenCourseData(unflattenedCourses) {
    const flat = [];
    for (const subject in unflattenedCourses) {
        for (const course in unflattenedCourses[subject]) {
            const courseInfo = unflattenedCourses[subject][course];
            flat.push({ subject, id: course, name: courseInfo[0] })
        }
    }
    return flat;
}