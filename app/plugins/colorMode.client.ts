/**
 * color-mode 의 preference 가 'system' 일 때만 시간대 기반 자동 전환을 수행.
 * - 페이지 진입 시 1회 즉시 반영
 * - 10분마다 주기 체크 (경계 시각 06:00 / 18:00 근처에서 자동 스위칭)
 */
export default defineNuxtPlugin({
  name: 'time-aware-color-mode',
  parallel: true,
  setup() {
    const { startAutoToggle } = useTimeAwareColorMode()
    const id = startAutoToggle()

    if (id !== null) {
      window.addEventListener('beforeunload', () => window.clearInterval(id), { once: true })
    }
  },
})
