export default defineNuxtRouteMiddleware(async (to) => {
  // 인증 불필요 페이지
  const publicPaths = ['/auth/login', '/auth/signup', '/share']
  if (publicPaths.some(p => to.path.startsWith(p))) return

  // 홈, 상점은 비로그인도 접근 허용 (제한된 기능)
  const optionalAuthPaths = ['/', '/shop']
  if (optionalAuthPaths.includes(to.path)) return

  // better-auth 세션 체크
  if (import.meta.client) {
    const { useSession } = await import('~/lib/auth-client')
    const { data: session } = useSession()
    if (!session.value) {
      return navigateTo('/auth/login')
    }
  }
})
