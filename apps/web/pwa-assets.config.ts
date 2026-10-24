import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Icon art already has its own burgundy background; keep it edge to edge.
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#6D2932' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#6D2932' } },
  },
  images: ['public/icon.svg'],
})
