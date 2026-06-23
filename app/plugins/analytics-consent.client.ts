import { authClient } from '~/lib/auth-client'

/**
 * P2-2 (PIPA): GA4 분석 opt-in 게이트.
 *
 * nuxt-gtag 는 `initMode: 'manual'`(nuxt.config) 로 부팅 시 gtag.js 를 주입하지 않는다.
 * 본 플러그인은 사용자가 분석 수집에 동의(better-auth session 의 analyticsConsent=true)했을
 * 때만 `useGtag().initialize()` 로 스크립트를 주입한다. 동의 철회 시 disableAnalytics().
 *
 * → 동의 전에는 GA4 스크립트/쿠키/네트워크 전송이 발생하지 않는다(자동 활성 제거).
 * 비로그인/미동의 사용자는 분석 비활성. (광고 식별자/ATT 는 P3-3 에서 별도 처리.)
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { initialize, disableAnalytics } = useGtag()
  const session = authClient.useSession()
  let started = false

  watch(
    () =>
      (session.value?.data?.user as { analyticsConsent?: boolean } | undefined)?.analyticsConsent === true,
    (consented) => {
      if (consented && !started) {
        // M5 (code-review): initialize() 동기 throw 시 started 를 올리지 않아 다음 동의 변화 때 재시도
        // 가능하게 한다(과거: 실패해도 started=true → GA 미작동인데 작동했다고 간주). 비동기 스크립트
        // 로드 실패는 여기서 못 잡으므로(브라우저 async) best-effort.
        try {
          initialize()
          started = true
        }
        catch {
          // GA4 스크립트 주입 실패(차단/no-op) — started 유지 false. (client 측이라 별도 logger 없음)
        }
      }
      else if (!consented && started) {
        started = false
        disableAnalytics()
      }
    },
    { immediate: true },
  )
})
