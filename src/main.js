import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './index.css'
import './firebase.js'

router.afterEach(Swal.close)

createApp(App).use(router).mount('#app')
