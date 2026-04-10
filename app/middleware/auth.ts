/**
 * JWT auth guard.
 *
 * Reads access_token cookie (set by useAuth().setTokens on login/signup).
 * - Public paths (/auth/*, /share/*) → skip
 * - Optional-auth paths (/, /shop) → skip
 * - Everything else → redirect to /auth/login if no token
 */
export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = ['/auth/login', '/auth/signup', '/share']
  if (publicPaths.some((p) => to.path.startsWith(p))) return

  const optionalAuthPaths = ['/', '/shop']
  if (optionalAuthPaths.includes(to.path)) return

  const token = useCookie('access_token').value
  if (!token) {
    return navigateTo('/auth/login')
  }
})
