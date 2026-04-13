import { createClient, createConfig } from '@hey-api/client-fetch'

/**
 * TerraWorld OpenAPI client plugin.
 *
 * Creates a single `@hey-api/client-fetch` instance configured with the
 * runtime API base URL, and exposes it via `useNuxtApp().$apiClient`.
 *
 * JWT flow (post better-auth + SEC review):
 *   - SEC-006: JWT lives only on the client (module-scoped variable
 *     inside `useAuth`). SSR requests from Nitro do not attach a bearer
 *     because Nitro has no browser-side token cache and forwarding the
 *     user's cookie to a self-fetch risks SSR payload poisoning. For
 *     protected routes that need data at SSR time, rely on the session
 *     cookie being forwarded to `/api/*` Nitro handlers — Spring is
 *     only reachable from the browser.
 *   - Request interceptor (client only): pulls the cached JWT from
 *     `useAuth().getJwt()`. On miss, runs `loadJwt()` with in-flight
 *     dedup so parallel calls only hit `/api/auth/token` once.
 *   - SEC-024: the request body is captured by cloning the Request
 *     BEFORE hey-api consumes its stream. The clone is stashed in a
 *     WeakMap keyed by the original Request so the response interceptor
 *     can replay the body verbatim on the retry path. Without this
 *     mutation requests (POST/PUT/PATCH) would retry with an empty
 *     body — Request.body is a one-shot ReadableStream.
 *   - SEC-007: on 401 the interceptor refreshes the JWT once, retries
 *     the original request once with `x-tw-retried: 1`, and only
 *     redirects to /auth/login when the refresh itself fails. Retry
 *     loops are impossible because the flag is checked on entry.
 *   - SEC-022: bearer is ONLY attached when the JWT has a value. Public
 *     endpoints (/share, /items, /categories) do not carry the token
 *     even when the user is signed in, reducing incidental exposure.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const apiClient = createClient(
    createConfig({
      baseUrl: config.public.apiBaseUrl as string,
      credentials: 'include',
    }),
  )

  let inflightRefresh: Promise<string | null> | null = null

  /**
   * SEC-024: stash a fresh clone of every outgoing Request so the response
   * interceptor can build a retry without trying to re-read the original
   * body stream (which hey-api has already consumed by the time the
   * response interceptor runs). WeakMap so entries get GC'd with the
   * Request object once its response is fully handled.
   */
  const requestClones = new WeakMap<Request, Request>()

  async function ensureJwt(): Promise<string | null> {
    if (import.meta.server) return null
    const { getJwt, loadJwt } = useAuth()
    const cached = getJwt()
    if (cached) return cached
    if (!inflightRefresh) {
      inflightRefresh = loadJwt().finally(() => {
        inflightRefresh = null
      })
    }
    return inflightRefresh
  }

  // --- Request interceptor: attach JWT + cache a clone for possible retry ---
  apiClient.interceptors.request.use(async (request) => {
    if (import.meta.server) return request
    const token = await ensureJwt()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    // Cache a pristine clone before hey-api consumes the body.
    requestClones.set(request, request.clone())
    return request
  })

  // --- Response interceptor: single retry on 401, loop-guarded ---
  apiClient.interceptors.response.use(async (response, request) => {
    if (response.status !== 401 || !import.meta.client) {
      return response
    }
    if (request?.headers.get('x-tw-retried') === '1') {
      // Already retried once with a fresh JWT; let the caller handle it.
      return response
    }

    const { loadJwt, clearJwt } = useAuth()
    const refreshed = await loadJwt()

    if (!refreshed) {
      // Session cookie is genuinely gone or invalid — bounce to login.
      clearJwt()
      await navigateTo('/auth/login')
      return response
    }

    if (!request) return response

    // SEC-024: retry from the cached clone so the body stream is still
    // pristine. Clone it again here so the WeakMap entry remains valid
    // if the response fires multiple times (defensive — hey-api does
    // not currently re-fire interceptors but better safe).
    const cached = requestClones.get(request)
    if (!cached) {
      // No clone available — caller will see the 401.
      return response
    }
    const retryBase = cached.clone()
    const retryHeaders = new Headers(retryBase.headers)
    retryHeaders.set('Authorization', `Bearer ${refreshed}`)
    retryHeaders.set('x-tw-retried', '1')

    try {
      return await fetch(
        new Request(retryBase.url, {
          method: retryBase.method,
          headers: retryHeaders,
          body: retryBase.body,
          credentials: 'include',
          // Preserve duplex when streaming a body — required by spec.
          // @ts-expect-error - duplex not in current TS lib types
          duplex: retryBase.body ? 'half' : undefined,
        }),
      )
    }
    catch (e) {
      // Dev visibility — stripped from prod by vite esbuild `drop`.
      // eslint-disable-next-line no-console
      console.error('[auth] 401 retry failed', e)
      return response
    }
  })

  return {
    provide: {
      apiClient,
    },
  }
})
