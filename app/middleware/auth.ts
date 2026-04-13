/**
 * Auth route guard — runs on both SSR and CSR.
 *
 * Strategy: protect by default, allowlist public paths. Checks for the
 * presence of better-auth's session cookie (`tw.session_token`) to decide
 * whether the visitor is authenticated. Full cryptographic validation of
 * the session happens server-side via the Nitro handler when API calls
 * are actually made — this guard only handles routing UX.
 */

const PUBLIC_EXACT = new Set(['/', '/auth/login', '/auth/signup', '/shop'])
const PUBLIC_PREFIXES = ['/share/']

function isPublicRoute(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true
  return PUBLIC_PREFIXES.some(p => path.startsWith(p) && path.length > p.length)
}

export default defineNuxtRouteMiddleware((to) => {
  if (isPublicRoute(to.path)) return

  const sessionCookie = useCookie('tw.session_token').value
  if (!sessionCookie) {
    return navigateTo('/auth/login')
  }
})
