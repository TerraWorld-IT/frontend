import { Capacitor } from '@capacitor/core'

/**
 * Capacitor client-only plugin.
 *
 * Initializes native app lifecycle hooks:
 * - Status bar configuration
 * - Deep link listener (appUrlOpen → navigateTo)
 * - Push notification listeners
 * - Back button handling (Android)
 * - Keyboard class toggle
 *
 * Note: Splash screen is NOT hidden here — use useNative().hideSplash()
 * from the app root to avoid duplicate hide calls.
 */

/** Only allow internal routes: must start with / and not // (prevents open redirect) */
const SAFE_ROUTE_RE = /^\/[^/]/

/** Deep link allowlist: only specific path patterns are navigable */
const DEEP_LINK_RE = /^\/share\/[A-Za-z0-9_-]{1,64}$/

export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform()) return

  // --- Status Bar ---
  if (Capacitor.getPlatform() === 'android') {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#FFF8EB' }) // riso-cream
  }

  // --- Deep Link Handler ---
  const { App } = await import('@capacitor/app')
  App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url)
      if (DEEP_LINK_RE.test(url.pathname)) {
        navigateTo(url.pathname)
      }
    } catch {
      // Invalid URL — ignore
    }
  })

  // --- Back Button (Android) ---
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      App.exitApp()
    }
  })

  // --- Push Notification Listeners ---
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    PushNotifications.addListener('registration', (token) => {
      localStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.value)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification.data as Record<string, string> | undefined
      const route = data?.route
      // SEC-001: validate route is internal path only (prevent open redirect)
      if (route && SAFE_ROUTE_RE.test(route)) {
        navigateTo(route)
      }
    })
  } catch {
    // Push not available — ignore (e.g., iOS simulator)
  }

  // --- Keyboard ---
  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open')
    })
  } catch {
    // Keyboard plugin not available
  }
})
