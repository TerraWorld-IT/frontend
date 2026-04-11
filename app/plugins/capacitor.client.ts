import { Capacitor } from '@capacitor/core'

/**
 * Capacitor client-only plugin.
 *
 * Initializes native app lifecycle hooks:
 * - Splash screen hide after page load
 * - Status bar configuration
 * - Deep link listener (appUrlOpen → navigateTo)
 * - Push notification listeners
 * - Back button handling (Android)
 */
export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform()) return

  // --- Splash Screen: hide after app mount ---
  const { SplashScreen } = await import('@capacitor/splash-screen')
  // Small delay to ensure Nuxt has rendered the first meaningful paint
  setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 300 })
  }, 500)

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
      // Route share links to in-app navigation
      if (url.pathname.startsWith('/share/')) {
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
      if (import.meta.dev) {
        // eslint-disable-next-line no-console
        console.log('[push] registered:', token.value)
      }
      // Store token for backend registration
      localStorage.setItem('tw-push-token', token.value)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      // Handle notification tap — navigate to relevant page
      const data = notification.notification.data as Record<string, string> | undefined
      if (data?.route) {
        navigateTo(data.route)
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
