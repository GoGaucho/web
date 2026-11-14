import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import reactivityTransform from '@vue-macros/reactivity-transform/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { weeklyMenuHandler } from './functions/weekly-menu.cjs'

const weeklyMenuApi = {
  name: 'weekly-menu-api',
  configureServer(server) {
    server.middlewares.use('/api/dining/week', weeklyMenuHandler)
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/dining/week', weeklyMenuHandler)
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    weeklyMenuApi,
    vue(),
    reactivityTransform(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', 'robots.txt', '404.html'],
      manifest: {
        name: 'GoGaucho',
        short_name: 'GoGaucho',
        description: 'The best campus app for UCSB students',
        theme_color: '#ffffff',
        icons: [{
          src: 'icons/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        }, {
          src: 'icons/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        }, {
          src: 'icons/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        }]
      }
    })
  ]
})
