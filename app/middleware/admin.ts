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

  // `if (!userStore.me)` 로 첫 로드에만 가져오면, ADMIN → USER 강등 이후에도 캐시된
  // `role: 'ADMIN'` 이 영원히 통과한다. 스토어에 TTL(15초)이 생겼으므로 그냥 매번 부르면
  // 캐시가 신선할 땐 네트워크를 타지 않고, 낡았을 땐 갱신된다 — 노출 창이 15초로 묶인다.
  // (admin **데이터** 자체는 Spring 이 JWT 의 role claim 으로 계속 막는다. 여기는 방어 2선.)
  try {
    await userStore.fetchMe()
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
