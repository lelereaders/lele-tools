import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/accounting/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '樂樂帳務',
        short_name: '樂樂帳務',
        description: '樂樂文化帳務管理',
        theme_color: '#FF6BAC',
        background_color: '#FAD4E8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/accounting/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/accounting/index.html'
      }
    })
  ]
})
