import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './index.css'

router.afterEach(Swal.close)

createApp(App).use(router).mount('#app')

console.log('%cGoGaucho', 'font-size: 4rem; font-weight: bold;')
