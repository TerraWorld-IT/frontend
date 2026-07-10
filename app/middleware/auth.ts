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

// CSR getSession() 호출에 명시적 타임아웃이 없으면, 모바일 WebView 등 네트워크가
// 불안정한 환경에서 요청이 멈춰버릴 경우 이 미들웨어의 await 가 영원히 resolve 되지
// 않아 이후의 모든 클라이언트 사이드 네비게이션이 막힐 수 있다. fail-closed: 타임아웃
// 시 로그인으로 보낸다(어차피 실제 세션 검증은 API 호출 시 서버가 다시 한다).
const SESSION_CHECK_TIMEOUT_MS = 5_000

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

  // 이미 유효한 JWT 를 들고 있으면(= 이 세션으로 토큰을 발급받은 적이 있으면) 세션을 다시
  // 묻지 않는다. 이 가드는 라우팅 UX 만 담당하고 실제 검증은 API 호출 시 서버가 수행하므로,
  // 매 탭 전환마다 `/api/auth/get-session` 왕복(프로덕션 실측 0.24~0.39s)을 앞세울 이유가 없다.
  // 화면 전환이 그 왕복만큼 통째로 멈춰 보이던 원인이 바로 여기였다.
  //
  // 세션이 서버에서 철회되면 다음 API 호출이 401 을 받고 `plugins/openapi.ts` 인터셉터가
  // `/api/auth/token` 재발급을 시도한다. 거기서 401/403 이면 그때 로그인으로 보낸다.
  // `clearJwt()`(로그아웃·세션 무효)가 `isLoggedIn` 을 false 로 되돌리므로, 다음 보호 라우트
  // 진입에서 아래 세션 확인이 다시 돈다.
  if (useAuth().isLoggedIn.value) return

  // CSR: httpOnly 쿠키는 document.cookie 에서 안 보임 → better-auth 세션으로 확인.
  // Promise.race 로 바깥에서 흉내내지 않고 better-fetch 의 fetchOptions.timeout 을 써서
  // 타임아웃 시 실제로 요청 자체가 abort 되도록 한다(진 쪽 요청이 orphan 으로 계속
  // 진행되며 뒤늦게 세션 쿠키를 갱신하는 걸 방지).
  // better-auth 클라이언트의 내부 proxy 체인(createDynamicPathProxy → betterFetch)은
  // catchAllError 를 켜지 않아, timeout 에 의한 AbortError 가 {data:null} 이 아니라
  // 그대로 throw 된다 — try/catch 없이 두면 fail-closed 리다이렉트 대신 미들웨어 자체가
  // uncaught exception 으로 깨진다. 여기서만 감싸 두 실패 경로(정상 응답의 data 없음 /
  // abort 로 인한 throw) 를 동일하게 fail-closed 로 수렴시킨다.
  try {
    const { data } = await authClient.getSession({
      fetchOptions: { timeout: SESSION_CHECK_TIMEOUT_MS },
    })
    if (!data) return navigateTo('/auth/login')
  } catch (error) {
    // 개발 확인용 — vite esbuild `drop` 설정으로 프로덕션 빌드에서는 제거됨.
    // eslint-disable-next-line no-console
    console.warn('[auth middleware] session check failed, redirecting to login', error)
    return navigateTo('/auth/login')
  }
})
