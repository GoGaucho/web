import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

const updateSW = registerSW({
  onOfflineReady () {}
})

router.afterEach(Swal.close)

createApp(App).use(router).mount('#app')

console.log('%cGoGaucho', 'font-size: 3.5rem; font-weight: bold;')
