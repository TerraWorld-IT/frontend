/**
 * Admin role guard middleware.
 * Use with `definePageMeta({ middleware: ['auth', 'admin'] })` on admin pages.
 *
 * SEC-017: Admin pages are rendered CSR-only (see nuxt.config.ts routeRules
 * `/admin/**: { ssr: false }`). This middleware runs on the client after
 * hydration so the SSR shell never contains admin data. A non-admin who
 * navigates directly to `/admin/*` gets the shell, this middleware
 * redirects before anything protected loads.
 */
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return // CSR-only — admin pages are ssr: false

  const userStore = useUserStore()

  // `if (!userStore.me)` 로 첫 로드에만 가져오면 ADMIN → USER 강등 이후에도 캐시된
  // `role: 'ADMIN'` 이 **영원히** 통과한다. TTL(15초)에 맡기는 것도 부족하다 —
  // 강등 직전에 받아온 프로필이 15초간 신선한 것으로 남아 그대로 통과하기 때문이다.
  // 어드민 진입은 드물고 요청 하나가 아깝지 않으므로 캐시를 무시하고 서버에 직접 묻는다.
  //
  // 주의: Spring 도 즉시 막아주지는 않는다. `SecurityConfig` 의 `/admin/**` 권한은
  // `JwtAuthenticationFilter` 가 **JWT 의 role claim** 에서 읽으며 그 토큰은 최대 5분 유효하다.
  // 즉 강등된 사용자의 직접 API 호출은 토큰 만료까지 통과한다(SEC-010 의 기존 트레이드오프).
  // 이 가드는 그 창 동안 UI 진입만 막는다.
  try {
    await userStore.fetchMe(true)
  }
  catch {
    // fail-closed — 역할을 확인할 수 없으면 어드민으로 들여보내지 않는다.
    return navigateTo('/')
  }

  // Pinia setup stores auto-unwrap refs at the store boundary, so
  // `userStore.me` is the value directly (not a ref).
  const role = (userStore.me as { role?: string } | null)?.role
  if (role !== 'ADMIN') {
    return navigateTo('/')
  }
})
