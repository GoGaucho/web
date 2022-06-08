import { reactive } from 'vue'

export const state = reactive({
  loading: false,
  quarter: '', // current quarter
  course: {},
  user: {},
  screen: { sm: false, md: false },
  isStandalone: window.matchMedia('(display-mode: standalone)').matches
})

window.onresize = () => {
  state.screen.md = window.innerWidth < 768
  state.screen.sm = window.innerWidth < 640
}
window.onresize()

export default state

export const LS = window.localStorage

// LS cache { ':': value, _: expire time }
export const cache = {
  get: k => {
    const _k = '_' + k
    if (!LS[_k]) return null
    const raw = JSON.parse(LS[_k])
    return raw._ > Date.now() ? raw[':'] : null
  },
  set: (k, v, expire = 7*86400e3) => {
    LS['_' + k] = JSON.stringify({ _: Date.now() + expire, ':': v })
  }
}

// automatically clear cache
setTimeout(() => {
  for (const _k in LS) {
    if (_k[0] !== '_') continue
    const raw = JSON.parse(LS[_k])
    if (raw._ > Date.now()) continue
    LS.removeItem(_k)
  }
}, 5e3)
