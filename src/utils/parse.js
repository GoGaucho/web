const seasons = ['', 'Winter', 'Spring', 'Summer', 'Fall']

export const quarter = q => seasons[q[4]] + ' ' + q.substring(0, 4)
export const quarterNext = q => String(Math.floor((Number(q.substring(0, 4)) * 4 + Number(q[4])) / 4)) + String(Number(q[4]) % 4 + 1)
export const quarterLast = q => String(Math.floor((Number(q.substring(0, 4)) * 4 + Number(q[4]) - 2) / 4)) + String((Number(q[4]) + 2) % 4 + 1)
