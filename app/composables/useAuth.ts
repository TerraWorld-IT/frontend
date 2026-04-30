import { authClient } from '~/lib/auth-client'

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

let clientJwt: string | null = null

// SEC-010 보강: JWT 5분 TTL 이라 매 요청마다 401→retry 사이클을 도는 대신,
// 4분 주기 preemptive refresh 로 미리 갱신해 사용자 체감 latency 감소.
// 첫 loadJwt 성공 시 자동으로 시작, clearJwt / signOutAndClear 시 정리.
const JWT_REFRESH_INTERVAL_MS = 4 * 60 * 1000
let refreshTimer: ReturnType<typeof setInterval> | null = null

export function useAuth() {
  const isLoggedIn = useState('auth.isLoggedIn', () => false)

  async function loadJwt(): Promise<string | null> {
    // SEC-006: never cache JWT during SSR. SSR traffic carries the
    // session cookie forward to subsequent browser requests via
    // `@tanstack`-style hydration automatically through better-auth's
    // client. The bearer token is a browser-only concern.
    if (import.meta.server) return null

    try {
      const response = await $fetch<{ token: string }>('/api/auth/token', {
        credentials: 'include',
      })
      clientJwt = response.token
      isLoggedIn.value = true
      ensureAutoRefresh()
      return response.token
    }
    catch (e) {
      // ARCH-006: dev visibility for /api/auth/token failures.
      // Stripped from prod by vite esbuild `drop: ['console']`.
      // eslint-disable-next-line no-console
      console.error('[auth] loadJwt failed', e)
      clientJwt = null
      isLoggedIn.value = false
      return null
    }
  }

  function getJwt(): string | null {
    return import.meta.server ? null : clientJwt
  }

  async function signOutAndClear() {
    try {
      await authClient.signOut()
    }
    finally {
      clearJwt()
    }
  }

  function clearJwt() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    clientJwt = null
    isLoggedIn.value = false
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
      // best-effort. 실패 시 plugins/openapi.ts 의 401 인터셉터 폴백.
      loadJwt().catch(() => {})
    }, JWT_REFRESH_INTERVAL_MS)
  }

  return {
    isLoggedIn: readonly(isLoggedIn),
    getJwt,
    loadJwt,
    signOutAndClear,
    clearJwt,
  }
}
