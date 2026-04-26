// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config.js'
import App from './App.jsx'
import { installMlToastRuntime } from './utils/mlToastRuntime.js'

installMlToastRuntime()

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
