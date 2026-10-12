import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './context/theme-context'
import { AuthProvider } from './context/auth-context'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider><App /></AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

// Hide the preloader once the app has mounted
const preloader = document.getElementById('powerup-preloader')
if (preloader) {
  preloader.classList.add('fade-out')
  preloader.addEventListener('transitionend', () => {
    preloader.classList.add('hidden')
  })
}
