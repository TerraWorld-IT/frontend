import type { AuthResponse } from '@terraworld-it/openapi-frontend'

/**
 * JWT auth state shared across components via useState (SSR-safe).
 *
 * Tokens are persisted in cookies so that:
 * - SSR can read them (server-side requests)
 * - Client refreshes don't lose the session
 *
 * Call `setTokens()` after login/signup/refresh.
 * Call `clearTokens()` on logout or fatal 401.
 */
export function useAuth() {
  const accessToken = useCookie('access_token', { maxAge: 60 * 60 }) // 1h
  const refreshTokenCookie = useCookie('refresh_token', { maxAge: 60 * 60 * 24 * 7 }) // 7d
  const userId = useState<number | null>('auth.userId', () => null)
  const nickname = useState<string>('auth.nickname', () => '')

  const isLoggedIn = computed(() => !!accessToken.value)

  function setTokens(auth: AuthResponse) {
    accessToken.value = auth.accessToken
    refreshTokenCookie.value = auth.refreshToken
    userId.value = auth.userId
    nickname.value = auth.nickname
  }

  function clearTokens() {
    accessToken.value = null
    refreshTokenCookie.value = null
    userId.value = null
    nickname.value = ''
  }

  return {
    accessToken: readonly(accessToken),
    refreshToken: readonly(refreshTokenCookie),
    userId: readonly(userId),
    nickname: readonly(nickname),
    isLoggedIn,
    setTokens,
    clearTokens,
  }
}
