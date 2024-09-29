import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

const updateSW = registerSW({
  onOfflineReady () {}
})

const app = createApp(App)
app.use(router).mount('#app')

console.log('%cGoGaucho', 'font-size: 3.5rem; font-weight: bold;')
