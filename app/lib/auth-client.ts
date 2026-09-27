import { createAuthClient } from 'better-auth/vue'
import { jwtClient } from 'better-auth/client/plugins'
import { withTimeout } from '~/utils/withTimeout'

const AUTH_REQUEST_DEADLINE_MS = 15_000

async function boundedAuthFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const upstream = init?.signal ?? (input instanceof Request ? input.signal : undefined)
  const abort = () => controller.abort(upstream?.reason)
  if (upstream?.aborted) abort()
  else upstream?.addEventListener('abort', abort, { once: true })

  try {
    return await withTimeout(
      Promise.resolve().then(() => fetch(input, { ...init, signal: controller.signal })).then(async (response) => {
        // 헤더만 도착한 뒤 본문이 멈춰도 호출자가 계속 기다리지 않도록 한다.
        await response.clone().arrayBuffer()
        return response
      }),
      AUTH_REQUEST_DEADLINE_MS,
      controller,
    )
  }
  finally {
    upstream?.removeEventListener('abort', abort)
  }
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.NUXT_PUBLIC_AUTH_BASE_URL ?? '',
  fetchOptions: { customFetchImpl: boundedAuthFetch },
  plugins: [
    /**
     * Adds `authClient.getToken()` which pulls a fresh RS256 JWT from the
     * Nitro `/api/auth/token` endpoint. The token is signed with keys stored
     * in `auth.jwks` and verified by Spring via its JWKS fetcher.
     */
    jwtClient(),
  ],
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
