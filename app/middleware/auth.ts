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

// '/' 는 게스트용 콘텐츠 없이 항상 개인화된 대시보드(테라리움/지갑/출석)를 렌더링하므로
// public 이면 안 됨 — public 이었을 때는 미들웨어가 즉시 리다이렉트하지 않고 페이지가 먼저
// 렌더링을 시작한 뒤 API 401 인터셉터(plugins/openapi.ts)가 뒤늦게 /auth/login 으로 튕겨서
// "메인 화면이 잠깐 보였다가 로그인으로 리다이렉션되는" 플리커가 발생했다.
// '/shop' 도 같은 이유로 제거(Codex 감사 지적) — pages/shop/index.vue 의 loadShop() 이 게스트용
// 분기 없이 무조건 sdk.getMe() 를 호출하고 실패 시 throw 해서, 게스트 브라우징용으로 의도적으로
// public 이었던 게 아니라 '/' 와 동일한 누락이었던 것으로 보임.
const PUBLIC_EXACT = new Set(['/auth/login', '/auth/signup'])
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
