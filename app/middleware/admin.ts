/**
 * Admin role guard middleware.
 * Use with `definePageMeta({ middleware: ['auth', 'admin'] })` on admin pages.
 *
 * Checks that the authenticated user has 'ADMIN' role.
 * Falls back to home page if not authorized.
 */
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async () => {
  if (!import.meta.client) return // SSR guard handled by auth middleware

  const userStore = useUserStore()

  // Ensure user data is loaded
  if (!userStore.me.value) {
    await userStore.fetchMe()
  }

  const role = (userStore.me.value as { role?: string } | null)?.role
  if (role !== 'ADMIN') {
    return navigateTo('/')
  }
})
