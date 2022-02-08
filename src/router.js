import { createRouter, createWebHashHistory } from 'vue-router'
import { getAnalytics, logEvent } from 'firebase/analytics'
import { analytics } from './firebase.js'

const index = {
  '/': () => import('./views/Home.vue'),
  '/waitz': () => import('./views/Waitz.vue')
}

const routes = []
for (const r in index) routes.push({ path: r, component: index[r] })
const router = createRouter({ history: createWebHashHistory(), routes }) 

router.beforeEach(() => { NProgress.start() })
router.afterEach((to, from) => {
  Swal.close()
  NProgress.done()
  logEvent(analytics, 'web_router', { to: to.fullPath, from: from.fullPath })
})

export default router