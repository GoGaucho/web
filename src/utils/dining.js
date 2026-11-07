// Keep dish colors consistent in the daily and weekly menus, including
// nut-containing vegetarian dishes (the nut marker takes precedence).
export function dishColorClass(name) {
  if (name.includes('(w/nuts)')) return 'border-yellow-400 from-yellow-50'
  if (name.includes('(v)') || name.includes('(vgn)')) return 'border-green-400 from-green-50'
  return 'border-red-400 from-red-50'
}
