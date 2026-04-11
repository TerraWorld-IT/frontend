import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  baseURL: import.meta.env.NUXT_PUBLIC_AUTH_BASE_URL ?? '',
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
