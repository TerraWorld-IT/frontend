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

  // 푸시 등록 재시도 훅 — 아래 Push 블록에서 실제 구현으로 대체되고 resume 리스너가 호출.
  let retryPushRegistration: () => void = () => {}

  // --- Status Bar ---
  // 초기 스타일/배경색은 plugins/colorMode.client.ts 의 watch(immediate:true) 가 담당
  // (Codex Round 2 지적 — 여기서 Android 전용으로 Light/cream 을 무조건 설정하면, 두 플러그인의
  // 실행 순서에 따라 실제 다크모드 상태를 다시 덮어써버리는 경합이 생김. 단일 지점으로 통합).

  // --- iOS App Tracking Transparency ---
  // 부팅 경로에서 제거 (2026-07-15 FE-01): 여기서 `await requestTrackingAuthorization()` 하면
  // 첫 실행 시 사용자가 ATT 다이얼로그에 응답할 때까지 앱 마운트가 블록된다 (Nuxt 는 async
  // 플러그인 완료를 기다림 — `parallel: true` 도 mount 전에 전체 promise 를 기다려 해결 불가).
  // ATT 는 useAdMob.initialize() 가 광고 SDK 초기화 직전(iOS)에 자체 요청하므로(Apple 정책상
  // IDFA 접근 전 1회면 충분) 부팅 시점 요청은 중복이었다.

  // --- Deep Link Handler ---
  const { App } = await import('@capacitor/app')
  App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url)
      // 커스텀 스킴(terraworld://share/{code})은 URL 파싱상 'share' 가 host 로 들어가
      // pathname 만 보면 '/{code}' 라 매칭에 실패한다 (Codex R1) — host+pathname 으로 정규화.
      // path-form(terraworld:/share/x, terraworld:///share/x)은 host 가 비어 선행 '/' 가
      // 중복되므로 하나로 접는다 (Codex R2).
      const path = url.protocol === 'terraworld:'
        ? `/${url.host}${url.pathname}`.replace(/^\/+/, '/')
        : url.pathname
      if (DEEP_LINK_RE.test(path)) {
        navigateTo(path)
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

      // iOS: Firebase Messaging 미통합 상태라 이 토큰은 raw APNs 토큰이다 — 백엔드 FcmService 는
      // FCM registration token 을 기대하므로 등록해도 발송이 실패하고 무효 행만 쌓인다
      // (Codex R1). APNs→FCM 토큰 교환(FirebaseMessaging SPM) 통합 전까지 iOS 등록은 보류.
      // 통합 시 AppDelegate 가 FCM 토큰을 post 하게 되면 이 가드를 제거할 것.
      if (resolveDevicePlatform() === 'IOS') return

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

    // OS 레벨 등록 실패(APNs/FCM) — 이전에는 리스너 자체가 없어 invisible 했다 (audit B3-2).
    // 사용자 UX 는 차단하지 않고 GA4 신호로만 가시화 (SEC-008 정책과 동일).
    PushNotifications.addListener('registrationError', (err) => {
      trackPushRegistrationFailed({ reason: `os_registration_error:${String(err?.error ?? '').slice(0, 80)}` })
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification.data as Record<string, string> | undefined
      const route = data?.route
      // SEC-001: validate route is internal path only (prevent open redirect)
      if (route && SAFE_ROUTE_RE.test(route)) {
        navigateTo(route)
      }
    })

    // Foreground 수신 — OS 배너가 안 뜨는 포그라운드 상태에서 조용히 유실되던 알림을
    // 인앱 토스트로 표시 (audit B3-3). title 없으면 body 폴백, 둘 다 없으면 무표시.
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const title = notification.title ?? notification.body
      if (title) useToast().info(title)
    })

    // 권한 요청 + 등록 트리거 — 부팅 경로에서 로그인-이후로 이동 (2026-07-15 FE-01).
    // 이전에는 여기서 즉시 `await requestPermissions()` 해 첫 실행 시 사용자가 푸시 권한
    // 다이얼로그에 응답할 때까지 앱 마운트가 블록됐고, 미로그인 상태의 registerDevice 는
    // 401 로 버려져 "로그인 후 재등록 경로 없음" 갭이 있었다.
    // → isLoggedIn 이 true 가 되는 시점(부팅 세션 복원 or 이후 로그인 — refreshJwt 성공이
    //   유일한 true 전이점)에 1회 fire-and-forget 으로 요청+등록한다. 리스너는 위에서 이미
    //   부착됐으므로 'registration' 이벤트를 놓치지 않는다. 권한 프롬프트도 콘텐츠를 본 뒤에
    //   뜨므로 opt-in 관점에서도 개선.
    const { isLoggedIn } = useAuth()
    let pushRegistrationTriggered = false
    function triggerPushRegistration() {
      if (!isLoggedIn.value || pushRegistrationTriggered) return
      pushRegistrationTriggered = true
      void (async () => {
        try {
          const perm = await PushNotifications.requestPermissions()
          if (perm.receive === 'granted') {
            await PushNotifications.register()
          }
          // denied 는 latch 유지 — 같은 세션에서 반복 프롬프트/무의미 재시도 안 함.
        }
        catch {
          // 일시 실패 (플러그인/네이티브) — latch 해제해 다음 login/resume 에서 재시도.
          pushRegistrationTriggered = false
        }
      })()
    }
    retryPushRegistration = triggerPushRegistration
    watch(isLoggedIn, (loggedIn) => {
      if (!loggedIn) {
        // 로그아웃/계정 전환 — 다음 로그인 사용자로 registerDevice 를 다시 태워야 한다.
        pushRegistrationTriggered = false
        return
      }
      triggerPushRegistration()
    })
    triggerPushRegistration()

    // 미완료 IAP 콜드스타트 복구 (audit B1-2) — verify 에 bearer 가 필요하므로 로그인 이후에만.
    // 멱등(등록 1회 가드)이라 로그인 전이마다 호출해도 안전. fire-and-forget — 부팅 비차단.
    watch(isLoggedIn, (loggedIn) => {
      if (loggedIn) void recoverPendingPurchases()
    }, { immediate: true })
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
    // keyboard-open 해제는 Did(완료) 시점 — Will(시작) 시점에 제거하면 닫힘 애니메이션 중의
    // 두 번째 백드롭 탭이 "키보드 닫는 중" 판정을 놓쳐 시트까지 닫는다 (Codex R1 F6).
    Keyboard.addListener('keyboardDidHide', () => {
      document.body.classList.remove('keyboard-open')
    })
  } catch {
    // Keyboard plugin not available
  }

  // --- 빈 영역 탭 시 키보드 닫기 (실기기 QA 발견) ---
  // 지금까지는 제출/모달닫기/모드전환 같은 명시적 액션 지점에서만 dismissKeyboard() 를
  // 호출했다 — "포커스된 인풋 밖 빈 화면을 탭하면 키보드가 닫힌다"는 네이티브 앱의 표준
  // 동작 자체가 어디에도 없었다. 포커스된 input/textarea 가 있는 상태에서 그 요소 바깥을
  // 클릭하면 dismissKeyboard() 호출 — 이미 열려있는 다른 명시적 핸들러와 중복 호출돼도
  // dismissKeyboard() 자체가 멱등이라 안전.
  document.addEventListener('click', (e) => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return
    if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA') return
    const target = e.target
    if (target instanceof Node && (target === active || active.contains(target))) return
    void dismissKeyboard()
  })

  // --- Foreground 복귀 (Codex 감사 지적) ---
  // useAuth 의 4분 주기 setInterval 은 앱이 백그라운드로 가면 JS 실행이 멈춰 함께 멈춘다 —
  // 오래 백그라운드에 있다가 돌아오면 JWT(5분 TTL)가 만료된 채일 수 있다. resume 시 즉시
  // best-effort 로 갱신(실패해도 openapi.ts 의 401 인터셉터가 최종 폴백).
  App.addListener('resume', () => {
    useAuth().loadJwt().catch(() => {})
    // 푸시 등록이 일시 실패로 미완이면 복귀 시점에 재시도 (latch 가 성공/denied 를 걸러줌).
    retryPushRegistration()
  })
})
