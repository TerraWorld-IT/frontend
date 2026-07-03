/**
 * 인증 라우트 가드 — SSR 과 CSR 양쪽에서 실행된다.
 *
 * 전략: 기본 보호(protect-by-default) + 공개 경로 allowlist. 세션의 완전한 암호학적 검증은
 * 실제 API 호출 시 Nitro 핸들러(서버측)가 수행한다 — 이 가드는 라우팅 UX 만 담당한다.
 *
 * SSR: httpOnly 세션 쿠키(`tw.session_token`)가 요청 헤더에 있으므로 `useCookie` 로
 * presence(존재)만 확인하면 되고 비용이 저렴하다.
 * CSR: better-auth 쿠키는 httpOnly(server/lib/auth.ts advanced)라 `useCookie`(클라이언트에서
 * `document.cookie` 를 읽음)로는 절대 볼 수 없다 — presence 확인은 false-negative 로 모든 SPA
 * 네비게이션을 /auth/login 으로 튕긴다. 대신 better-auth 에 세션을 물어본다(쿠키 캐시 약 5분이라
 * 반복 네비게이션도 저렴; same-origin /api/auth/get-session 호출 — CSP `connect-src 'self'` 허용).
 */

import { authClient } from '~/lib/auth-client'

const PUBLIC_EXACT = new Set(['/', '/auth/login', '/auth/signup', '/shop'])
const PUBLIC_PREFIXES = ['/share/']

function isPublicRoute(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true
  return PUBLIC_PREFIXES.some(p => path.startsWith(p) && path.length > p.length)
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicRoute(to.path)) return

  // SSR: httpOnly 쿠키를 요청에서 읽을 수 있음 → 빠른 presence(존재) 확인.
  if (import.meta.server) {
    if (!useCookie('tw.session_token').value) return navigateTo('/auth/login')
    return
  }

  // CSR: httpOnly 쿠키는 document.cookie 에서 안 보임 → better-auth 세션으로 확인.
  const { data } = await authClient.getSession()
  if (!data) return navigateTo('/auth/login')
})
