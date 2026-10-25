/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const tunnelHosts = ['.trycloudflare.com']

// One .env file at the project root, shared with the server.
const envDir = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  // The local API server; the app calls relative /v1 URLs (one address, also through the tunnel).
  const proxy = { '/v1': `http://localhost:${env.API_PORT || 8787}` }

  return {
    envDir,
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
          // API calls always go to the network; never cached.
          navigateFallbackDenylist: [/^\/v1\//],
        },
      }),
    ],
    server: { host: true, allowedHosts: tunnelHosts, proxy },
    preview: { host: true, port: 4173, allowedHosts: tunnelHosts, proxy },
    test: {
      environment: 'node',
    },
  }
})
