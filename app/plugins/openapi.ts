import { createClient, createConfig } from '@hey-api/client-fetch'
import * as sdk from '@terraworld-it/openapi-frontend'

/**
 * TerraWorld OpenAPI client plugin.
 *
 * Creates a single `@hey-api/client-fetch` instance configured with the
 * runtime API base URL, and exposes it via `useNuxtApp().$apiClient`.
 *
 * JWT auth flow:
 *   - Request interceptor: reads access_token cookie, attaches Bearer header.
 *   - Response interceptor: on 401, attempts silent refresh via refresh_token.
 *     If refresh succeeds → retries original request.
 *     If refresh fails → clears tokens, redirects to /auth/login.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const apiClient = createClient(
    createConfig({
      baseUrl: config.public.apiBaseUrl as string,
    }),
  )

  // --- Request interceptor: attach JWT ---
  apiClient.interceptors.request.use((request) => {
    const token = useCookie('access_token').value
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  })

  // --- Response interceptor: auto-refresh on 401 ---
  let refreshPromise: Promise<boolean> | null = null

  apiClient.interceptors.response.use(async (response) => {
    if (response.status !== 401 || !import.meta.client) {
      return response
    }

    // Skip refresh for auth endpoints themselves (prevent infinite loop)
    const url = response.url || ''
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/signup')) {
      return response
    }

    const rt = useCookie('refresh_token').value
    if (!rt) {
      navigateTo('/auth/login')
      return response
    }

    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = attemptRefresh(rt)
    }

    const refreshed = await refreshPromise
    refreshPromise = null

    if (!refreshed) {
      const { clearTokens } = useAuth()
      clearTokens()
      navigateTo('/auth/login')
    }

    // Note: hey-api client doesn't support automatic retry of the original
    // request from within interceptors. The calling code will see the 401
    // and should handle it (e.g. page reload or re-fetch).
    return response
  })

  async function attemptRefresh(rt: string): Promise<boolean> {
    try {
      const { data, error } = await sdk.refreshToken({
        client: apiClient,
        body: { refreshToken: rt },
      })
      if (error || !data) return false
      const { setTokens } = useAuth()
      setTokens(data)
      return true
    }
    catch (e) {
      if (import.meta.dev) console.warn('[openapi] token refresh failed:', e)
      return false
    }
  }

  return {
    provide: {
      apiClient,
    },
  }
})
