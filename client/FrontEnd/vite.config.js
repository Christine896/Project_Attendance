import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoupdate',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      workbox: {
        cleanupOutdatedCaches: true, // Forces deletion of old files
        skipWaiting: true,           // Forces the new SW to install immediately
        clientsClaim: true,          // Forces the new SW to take control of the page
      },
      manifest: {
        name: 'Proxi Attendance System',
        short_name: 'Proxi',
        description: 'Secure QR-based Attendance for JKUAT',
        theme_color: '#4338CA', // Indigo-700
        background_color: '#D8B4FE', // Light Purple Dashboard
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: 'logo192.png', // Corrected name
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo512.png', // Corrected name
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  server: {
    host: true, 
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 10000 
  }
})