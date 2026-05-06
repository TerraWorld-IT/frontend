import { Capacitor } from '@capacitor/core'
import * as sdk from '@terraworld-it/openapi-frontend'

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

/** Capacitor platform → 백엔드 enum 매핑 */
function resolveDevicePlatform(): 'ANDROID' | 'IOS' | 'WEB' {
  const p = Capacitor.getPlatform()
  if (p === 'android') return 'ANDROID'
  if (p === 'ios') return 'IOS'
  return 'WEB'
}

export default defineNuxtPlugin(async (nuxtApp) => {
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

    // SEC-008: 등록 실패는 사용자 UX 차단 없이 GA4 신호로만 가시화.
    //   - sdk 의 typed error path: { error } 객체 반환 (4xx/5xx)
    //   - throw 분기: 네트워크 오류 / interceptor 의 redirect 등
    //   payload 에는 reason + status code 만 (PII / 토큰 절대 안 됨).
    const { trackPushRegistrationFailed } = useGtagEvents()

    PushNotifications.addListener('registration', async (token) => {
      localStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.value)

      // 서버에 디바이스 토큰 등록 — 멱등 (동일 user, token 은 lastSeenAt 만 갱신)
      // 인증/리프레시는 plugins/openapi.ts 의 인터셉터가 자동 처리.
      // 등록 실패는 silent (UX 차단 없음) — 토큰은 localStorage 에 보존되어 다음 세션에서 재시도.
      try {
        const client = nuxtApp.$apiClient as Parameters<typeof sdk.registerDevice>[0]['client']
        const { error, response } = await sdk.registerDevice({
          client,
          body: {
            token: token.value,
            platform: resolveDevicePlatform(),
          },
        })
        if (error) {
          trackPushRegistrationFailed({
            reason: 'sdk_error',
            status: response?.status ?? 0,
          })
        }
      }
      catch (e) {
        trackPushRegistrationFailed({
          reason: e instanceof Error ? `exception:${e.name}` : 'exception:unknown',
        })
      }
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
