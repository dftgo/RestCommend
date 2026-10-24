/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const tunnelHosts = ['.trycloudflare.com']

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'RestCommend',
        short_name: 'RestCommend',
        description: 'בחירת מסעדה ביחד',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#F5EFE4',
        background_color: '#F5EFE4',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true, allowedHosts: tunnelHosts },
  preview: { host: true, port: 4173, allowedHosts: tunnelHosts },
  test: {
    environment: 'node',
  },
})
