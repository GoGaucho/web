import { createRouter, createWebHashHistory } from 'vue-router'
import state from './model.js'

const index = {
  '/about': () => import('./views/About.vue'),
  '/link': () => import('./views/Link.vue'),
  '/map': () => import('./views/Map.vue'),
  '/dining': () => import('./views/Dining.vue'),
  '/waitz': () => import('./views/Waitz.vue'),
  '/course': () => import('./views/Course.vue'),
  '/planner': () => import('./views/Planner.vue'),
  '/class': () => import('./views/Class.vue'),
  '/poll': () => import('./views/Poll.vue'),
  '/:any(.*)*': () => import('./views/Home.vue')
}

const routes = []
for (const r in index) routes.push({ path: r, component: index[r] })
const router = createRouter({ history: createWebHashHistory(), routes }) 

router.beforeEach(() => { NProgress.start() })
router.afterEach(() => {
  Swal.close()
  NProgress.done()
  state.loading = state.showLogin = false
})

export default router