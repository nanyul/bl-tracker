import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'BL Tracker',
        short_name: 'BL Tracker',
        description: 'Tu biblioteca personal de manhwas/mangas/webtoons BL',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#EEEFE8',
        theme_color: '#E9ACBB',
        orientation: 'portrait-primary',
        lang: 'es',
        categories: ['books', 'entertainment'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Biblioteca', url: '/library', description: 'Ver mi biblioteca', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Buscar', url: '/search', description: 'Buscar manhwas' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } },
          },
          {
            urlPattern: /^https:\/\/uploads\.mangadex\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'mangadex-covers-cache', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } },
          },
          {
            urlPattern: /\/api\/proxy\/mangadex\/image\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'mangadex-pages-cache', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:81',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/BL/api/public'),
      },
    },
  },
})