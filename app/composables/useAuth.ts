import { authClient } from '~/lib/auth-client'
import { useHomeSnapshotStore } from '~/stores/homeSnapshot'
import { useTerrariumStore } from '~/stores/terrarium'
import { useUserStore } from '~/stores/user'

/**
 * Client-only JWT cache + auth lifecycle helpers.
 *
 * SEC-006 / SEC-027: the RS256 access token is NEVER stored in `useState`
 * or Nuxt payload or cookies. It lives in a module-scoped variable inside
 * this file (`clientJwt` below), and the entire `loadJwt` / `getJwt`
 * surface short-circuits on `import.meta.server`.
 *
 * IMPORTANT — these are NOT safe by virtue of "module is per-request":
 * Nitro loads modules ONCE per process and the variable would leak across
 * SSR users if anything ever set it on the server. The `import.meta.server`
 * guards are the ONLY barrier. Removing or weakening them re-opens the
 * cross-user JWT-leak vector that originally drove this rewrite. Treat
 * the guards as load-bearing security code, not stylistic preferences.
 *
 * ARCH-006: `loadJwt` failures log to console at dev time (stripped in
 * prod builds by vite `esbuild.drop: ['console']`) so a broken
 * `/api/auth/token` handler is not silently invisible.
 */

/**
 * `/api/auth/token` 의 실패는 서로 다른 두 상태다. 이걸 하나의 `null` 로 뭉개면 호출부가
 * 그중 하나(세션 만료)를 골라 행동으로 증폭한다 — 실제로 `plugins/openapi.ts` 의 401
 * 인터셉터가 일시적 네트워크 오류에도 `clearJwt()` + `/auth/login` 리다이렉트를 실행해,
 * 멀쩡한 7일 세션을 부팅 순간의 깜빡임 하나로 날리고 있었다.
 *
 *   - `ok`              : 토큰 발급 성공
 *   - `unauthenticated` : 세션이 실제로 무효 (401/403) → 로그아웃이 옳다
 *   - `transient`       : 네트워크 오류 / 429 / 5xx → 세션은 살아 있다. 절대 로그아웃 금지
 */
export type JwtRefreshResult =
  | { status: 'ok', token: string }
  | { status: 'unauthenticated' }
  | { status: 'transient' }

let clientJwt: string | null = null

// SEC-010 보강: JWT 5분 TTL 이라 매 요청마다 401→retry 사이클을 도는 대신,
// 4분 주기 preemptive refresh 로 미리 갱신해 사용자 체감 latency 감소.
// 첫 loadJwt 성공 시 자동으로 시작, clearJwt / signOutAndClear 시 정리.
const JWT_REFRESH_INTERVAL_MS = 4 * 60 * 1000
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 부팅 시 여러 API 가 동시에 토큰을 요구해도 `/api/auth/token` 은 한 번만 친다.
// (이전엔 plugins/openapi.ts 안에만 dedup 이 있어 401 인터셉터 경로는 중복 호출했다.)
let inflightRefresh: Promise<JwtRefreshResult> | null = null

// 세션 상태가 바뀔 때마다 증가한다. 진행 중이던 refresh 가 로그아웃 **이후에** 늦게 성공해
// clientJwt 와 4분 타이머를 되살리는 경쟁을 막는다.
let authEpoch: number = 0

// 일시적 실패는 짧게 물러섰다 다시 시도한다. 부팅 직후 콜드 스타트/셀룰러 전환처럼
// 한 번 삐끗하는 구간을 로그아웃으로 만들지 않기 위한 것.
const TRANSIENT_RETRY_DELAYS_MS: readonly number[] = [300, 900]

function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/** `$fetch` 의 FetchError 에서 HTTP 상태코드를 꺼낸다. 네트워크 오류면 undefined. */
function httpStatusOf(error: unknown): number | undefined {
  const e = error as { statusCode?: number, response?: { status?: number } } | null
  return e?.response?.status ?? e?.statusCode
}

async function requestToken(): Promise<JwtRefreshResult> {
  try {
    const response = await $fetch<{ token: string }>('/api/auth/token', {
      credentials: 'include',
      // ofetch 는 `retries = isPayloadMethod(method) ? 0 : 1` 이라 GET 을 **자동으로 1회
      // 더** 시도한다. 아래 백오프와 곱해지면 토큰 엔드포인트 장애 시 요청이 6배로 증폭되고
      // (429 를 악화시킨다) 콜드 스타트도 그만큼 더 기다린다. 재시도 정책은 여기서 소유한다.
      retry: 0,
    })
    return { status: 'ok', token: response.token }
  }
  catch (e) {
    const code = httpStatusOf(e)
    // ARCH-006: 개발 환경에서 토큰 재발급 실패를 확인하기 위한 로그.
    // 프로덕션 빌드에서는 vite esbuild `drop: ['console']` 로 제거된다.
    // eslint-disable-next-line no-console
    console.error('[auth] token request failed', code, e)
    if (code === 401 || code === 403) return { status: 'unauthenticated' }
    return { status: 'transient' }
  }
}

export function useAuth() {
  const isLoggedIn = useState<boolean>('auth.isLoggedIn', () => false)

  /**
   * 토큰을 발급받고 그 결과를 **상태로** 돌려준다. 호출부가 로그아웃 여부를 스스로 판단해야
   * 하므로 `null` 로 뭉개지 않는다. 일시적 실패는 짧은 백오프로 재시도한 뒤에도 실패하면
   * `transient` 를 반환하고 **세션 상태를 건드리지 않는다**.
   */
  async function refreshJwt(): Promise<JwtRefreshResult> {
    // SEC-006: SSR 중에는 JWT 를 절대 캐시하지 않는다. bearer 토큰은 브라우저만의 관심사다.
    // (모듈 스코프 `clientJwt` 은 Nitro 에서 요청 간 공유되므로 여기서 반드시 막아야 한다.)
    if (import.meta.server) return { status: 'transient' }

    if (inflightRefresh) return inflightRefresh

    const epoch = authEpoch
    const promise = (async (): Promise<JwtRefreshResult> => {
      let result = await requestToken()
      for (const delay of TRANSIENT_RETRY_DELAYS_MS) {
        if (result.status !== 'transient') break
        await sleep(delay)
        result = await requestToken()
      }

      // 이 refresh 가 도는 사이에 로그아웃(또는 다른 세션 종료)이 있었다면 결과를 반영하지
      // 않는다. 그러지 않으면 늦게 도착한 성공 응답이 clientJwt 와 4분 타이머를 되살린다.
      //
      // 상태를 저장하지 않는 것만으로는 부족하다. `ok` 를 그대로 돌려주면 호출부
      // (`plugins/openapi.ts` 의 401 인터셉터)가 그 토큰을 헤더에 붙여 **로그아웃 이후에**
      // 원래 요청을 재시도한다. 토큰을 아예 넘기지 않는다.
      if (authEpoch !== epoch) return { status: 'transient' }

      if (result.status === 'ok') {
        clientJwt = result.token
        isLoggedIn.value = true
        ensureAutoRefresh()
      }
      else if (result.status === 'unauthenticated') {
        // 세션이 진짜로 무효 — 토큰·타이머·플래그를 모두 정리한다.
        clearJwt()
      }
      // transient: clientJwt / isLoggedIn 을 그대로 둔다. 세션은 아직 살아 있다.
      return result
    })()

    inflightRefresh = promise
    // clearJwt() 가 그 사이 inflightRefresh 를 비우고 새 refresh 가 시작됐을 수 있다.
    // 내가 넣어둔 것이 아직 그대로일 때만 치운다.
    void promise.finally(() => {
      if (inflightRefresh === promise) inflightRefresh = null
    })

    return promise
  }

  /** 기존 호출부 호환용 얇은 래퍼. 실패 사유가 필요하면 `refreshJwt()` 를 쓸 것. */
  async function loadJwt(): Promise<string | null> {
    const result = await refreshJwt()
    return result.status === 'ok' ? result.token : null
  }

  function getJwt(): string | null {
    return import.meta.server ? null : clientJwt
  }

  async function signOutAndClear() {
    // 푸시 토큰 로컬 정리 (audit B3-4) — 로그아웃 후 이전 사용자 토큰이 localStorage 에
    // 잔존하던 문제. 서버측 디바이스 행 비활성화 API 는 아직 없어(등록/upsert 만 존재)
    // 다음 사용자가 registerDevice 할 때 이전 소유 행이 비활성화되는 경로에 의존한다 —
    // 같은 기기 무로그인 상태의 잔여 푸시 수신은 서버 API 신설 전까지 알려진 한계.
    if (import.meta.client) {
      try {
        useNative().clearPushToken()
      }
      catch {
        // 네이티브 미지원/플러그인 부재 — 로그아웃 자체를 막지 않는다.
      }
    }
    try {
      await authClient.signOut()
    }
    finally {
      clearJwt()
    }
  }

  function clearJwt() {
    // epoch 를 올려, 진행 중이던 refresh 가 나중에 성공하더라도 토큰을 되살리지 못하게 한다.
    authEpoch += 1
    inflightRefresh = null
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    clientJwt = null
    isLoggedIn.value = false

    // 사용자별 캐시도 함께 버린다. 스토어에 TTL 캐시(프로필 15초 / 테라리움 15초)가 생긴 뒤로,
    // 이걸 비우지 않으면 같은 SPA 세션에서 A 가 로그아웃하고 B 가 곧바로 로그인했을 때
    // 홈의 `fetchMe()` 가 TTL 에 걸려 skip 되어 **A 의 프로필·잔액·테라리움이 B 에게 보인다**.
    // A 가 ADMIN 이었다면 캐시된 role 이 `middleware/admin.ts` 도 통과시킨다.
    // (아이템 카탈로그는 사용자별이 아니라 공개 데이터이므로 비우지 않는다.)
    //
    // clearJwt() 는 4분 refresh 타이머 콜백에서도 불린다. 그 시점엔 컴포넌트 컨텍스트가 없어
    // Pinia 가 activePinia 를 못 찾으면 throw 할 수 있고, 그러면 signOutAndClear() 의 finally 가
    // 터져 로그아웃 자체가 실패한다. 토큰 정리는 이미 위에서 끝났으니 여기서 삼킨다.
    if (import.meta.client) {
      try {
        useUserStore().reset()
        useTerrariumStore().reset()
        useHomeSnapshotStore().reset()
      }
      catch (e) {
        // eslint-disable-next-line no-console
        console.error('[auth] store reset failed on clearJwt', e)
      }
    }
  }

  /**
   * 4분 주기 preemptive JWT refresh. loadJwt 첫 성공 시 자동 가동.
   * SSR 환경 / 이미 가동 중 / clientJwt 없음 시 no-op.
   */
  function ensureAutoRefresh() {
    if (import.meta.server) return
    if (refreshTimer) return
    refreshTimer = setInterval(() => {
      if (!clientJwt) return
      // best-effort. 일시적 실패는 plugins/openapi.ts 의 401 인터셉터가 폴백으로 처리한다.
      void refreshJwt()
        .then((result) => {
          // 세션이 진짜로 죽었다면 `refreshJwt` 가 이미 `clearJwt()` 로 캐시를 비웠다. 하지만
          // 이 경로에는 요청도 인터셉터도 없어 아무도 화면을 바꾸지 않는다. 그러면 스토어는
          // 비었는데 페이지의 로컬 스냅샷(홈의 테라리움, 최근 기록 등)은 그대로 남아
          // 이전 사용자의 내용이 계속 보인다. 직접 로그인으로 보낸다.
          if (result.status === 'unauthenticated') void navigateTo('/auth/login')
        })
        .catch(() => {})
    }, JWT_REFRESH_INTERVAL_MS)
  }

  return {
    isLoggedIn: readonly(isLoggedIn),
    getJwt,
    loadJwt,
    refreshJwt,
    signOutAndClear,
    clearJwt,
  }
}
