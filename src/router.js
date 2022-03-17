import { createRouter, createWebHashHistory } from 'vue-router'
import { log, state } from './firebase.js'

const index = {
  '/about': () => import('./views/About.vue'),
  '/link': () => import('./views/Link.vue'),
  '/map': () => import('./views/Map.vue'),
  '/dining': () => import('./views/Dining.vue'),
  '/waitz': () => import('./views/Waitz.vue'),
  '/course': () => import('./views/Course.vue'),
  '/planner': () => import('./views/Planner.vue'),
  '/schedule': () => import('./views/Schedule.vue'),
  '/classroom': () => import('./views/Classroom.vue'),
  '/:any(.*)*': () => import('./views/Home.vue')
}

const routes = []
for (const r in index) routes.push({ path: r, component: index[r] })
const router = createRouter({ history: createWebHashHistory(), routes }) 

router.beforeEach(() => { NProgress.start() })
router.afterEach((from, to) => {
  Swal.close()
  NProgress.done()
  state.loading = false
  log('page_view', { page_path: to.path })
})

export default router