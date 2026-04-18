import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'mediCode',
        short_name: 'mediCode',
        description: 'Your medical profile, scannable in any language.',
        theme_color: '#dc2626',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Cache Supabase profile fetches — NetworkFirst so online always gets fresh data,
            // offline falls back to last cached version
            urlPattern: /supabase\.co\/rest\/v1\/profiles/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-profiles',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Translation and TTS APIs — network only, no caching
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
