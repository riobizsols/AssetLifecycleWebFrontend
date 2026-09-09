// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import i18n from './i18n/config.js'
import App from './App.jsx'
import { installMlToastRuntime } from './utils/mlToastRuntime.js'
import { startInspectionSyncService } from './offline/syncService.js'

installMlToastRuntime()
startInspectionSyncService()

// Register PWA service worker (vite-plugin-pwa); no-op if virtual module unavailable in tests
try {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true })
    })
    .catch(() => {})
} catch {
  // ignore
}

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  // </StrictMode>,
)
