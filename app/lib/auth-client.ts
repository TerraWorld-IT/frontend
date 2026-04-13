import { createAuthClient } from 'better-auth/vue'
import { jwtClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: import.meta.env.NUXT_PUBLIC_AUTH_BASE_URL ?? '',
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
