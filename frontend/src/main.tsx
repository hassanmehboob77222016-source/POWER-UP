import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './context/theme-context'
import { AuthProvider } from './context/auth-context'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

const preloader = document.getElementById('powerup-preloader')
if (preloader) {
  const loader = preloader.querySelector<HTMLElement>('.powerup-loader')
  let appReady = false
  let loaderComplete = !loader || window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const hideWhenReady = () => {
    if (appReady && loaderComplete) preloader.classList.add('fade-out')
  }

  if (loader && !loaderComplete) {
    loader.addEventListener('animationend', event => {
      if (event.animationName !== 'powerup-loader-sweep') return
      loaderComplete = true
      hideWhenReady()
    }, { once: true })
  }

  window.addEventListener('powerup:app-ready', () => {
    appReady = true
    hideWhenReady()
  }, { once: true })

  preloader.addEventListener('transitionend', event => {
    if (event.target === preloader && event.propertyName === 'opacity') {
      preloader.classList.add('hidden')
    }
  }, { once: true })
}

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider><App /></AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
