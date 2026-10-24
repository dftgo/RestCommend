import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/heebo/hebrew-400.css'
import '@fontsource/heebo/latin-400.css'
import '@fontsource/heebo/hebrew-500.css'
import '@fontsource/heebo/latin-500.css'
import '@fontsource/heebo/hebrew-600.css'
import '@fontsource/heebo/latin-600.css'
import '@fontsource/heebo/hebrew-700.css'
import '@fontsource/heebo/latin-700.css'
import './styles/tokens.css'
import './styles/base.css'
import { App } from './App'
import { requestPersistentStorage } from './platform/storage'

// Cache the app for offline use and pick up new versions automatically.
registerSW({ immediate: true })
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
