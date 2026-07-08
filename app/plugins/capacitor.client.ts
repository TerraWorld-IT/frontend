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
  // 초기 스타일/배경색은 plugins/colorMode.client.ts 의 watch(immediate:true) 가 담당
  // (Codex Round 2 지적 — 여기서 Android 전용으로 Light/cream 을 무조건 설정하면, 두 플러그인의
  // 실행 순서에 따라 실제 다크모드 상태를 다시 덮어써버리는 경합이 생김. 단일 지점으로 통합).

  // --- iOS App Tracking Transparency (P3-3) ---
  // IDFA(광고 식별자) 접근 전 ATT 동의 prompt 를 요청(Apple 정책). 광고 SDK 가 IDFA 를 쓰기 전에
  // 1회 호출돼야 함. Info.plist NSUserTrackingUsageDescription 동반.
  if (Capacitor.getPlatform() === 'ios') {
    try {
      await useAdMob().requestTrackingAuthorization()
    }
    catch {
      // ATT plugin 미가용 — 무시
    }
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
  const { popTopBackHandler } = useBackButtonStack()
  let lastExitPressAt = 0
  const EXIT_CONFIRM_WINDOW_MS = 2000

  App.addListener('backButton', ({ canGoBack }) => {
    // 1) 열린 모달/바텀시트가 있으면 라우트 이동 전에 그것부터 닫는다.
    if (popTopBackHandler()) return

    if (canGoBack) {
      window.history.back()
      return
    }

    // 2) 더 이상 뒤로 갈 라우트가 없음 — 실수로 즉시 종료되지 않도록 2초 내 재입력 확인.
    // useI18n()/useToast() 는 리스너 콜백 안에서 호출 — 플러그인 setup 시점(모듈 등록 순서에
    // i18n 초기화가 아직 안 끝났을 수 있음)이 아니라 실제 사용자가 뒤로가기를 누른 시점(앱
    // 초기화가 이미 끝난 뒤)에만 평가되도록 지연시켜 순서 의존성을 없앤다.
    const now = Date.now()
    if (now - lastExitPressAt < EXIT_CONFIRM_WINDOW_MS) {
      App.exitApp()
      return
    }
    lastExitPressAt = now
    const { t } = useI18n()
    useToast().info(t('common.pressBackAgainToExit'))
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

    // 권한 요청 + 등록 트리거 — 리스너가 부착된 뒤에 호출해야 'registration' 이벤트를 놓치지 않음.
    // 이 호출이 없으면 위 registration 리스너가 영원히 발화하지 않아 디바이스 토큰이 등록되지 않는다.
    // 로그인 세션이 있으면 위 리스너의 registerDevice 가 성공, 미로그인 시 토큰은 localStorage 에
    // 보존되고 다음 부팅(로그인 후)에서 재등록된다 (SEC-008 silent 처리).
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive === 'granted') {
      await PushNotifications.register()
    }
  } catch {
    // Push not available — ignore (e.g., iOS simulator)
  }

  // --- Keyboard ---
  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open')
      // 포커스된 인풋이 바텀시트/모달 안쪽에 있으면 키보드가 올라온 뒤에도 가려질 수 있음
      // (capacitor.config.ts 의 scrollAssist 는 body 스크롤만 보정, 중첩 overflow-y-auto
      // 컨테이너 안까지는 못 미침) — 키보드 애니메이션이 끝날 시간을 준 뒤 보정.
      setTimeout(() => {
        const active = document.activeElement
        if (active instanceof HTMLElement && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      }, 300)
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open')
    })
  } catch {
    // Keyboard plugin not available
  }

  // --- Foreground 복귀 (Codex 감사 지적) ---
  // useAuth 의 4분 주기 setInterval 은 앱이 백그라운드로 가면 JS 실행이 멈춰 함께 멈춘다 —
  // 오래 백그라운드에 있다가 돌아오면 JWT(5분 TTL)가 만료된 채일 수 있다. resume 시 즉시
  // best-effort 로 갱신(실패해도 openapi.ts 의 401 인터셉터가 최종 폴백).
  App.addListener('resume', () => {
    useAuth().loadJwt().catch(() => {})
  })
})
