/**
 * JWT auth guard — runs on both SSR and CSR.
 *
 * Strategy: protect by default, allowlist public paths.
 * Reads access_token cookie (set by useAuth().setTokens on login/signup).
 */

const PUBLIC_EXACT = new Set(['/', '/auth/login', '/auth/signup', '/shop'])
const PUBLIC_PREFIXES = ['/share/']

function isPublicRoute(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true
  return PUBLIC_PREFIXES.some(p => path.startsWith(p) && path.length > p.length)
}

export default defineNuxtRouteMiddleware((to) => {
  if (isPublicRoute(to.path)) return

  const token = useCookie('access_token').value
  if (!token) {
    return navigateTo('/auth/login')
  }
})
