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

  if (!userStore.me) {
    await userStore.fetchMe()
  }

  // Pinia setup stores auto-unwrap refs at the store boundary, so
  // `userStore.me` is the value directly (not a ref).
  const role = (userStore.me as { role?: string } | null)?.role
  if (role !== 'ADMIN') {
    return navigateTo('/')
  }
})
