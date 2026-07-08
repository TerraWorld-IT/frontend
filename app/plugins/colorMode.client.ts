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

    // 네이티브 상태바를 앱의 dark-mode 전환에 동기화(Codex 감사 지적) — 이전엔 부팅 시
    // 1회 light/cream 으로 고정된 채 앱이 밤 시간대 dark 로 전환돼도 상태바만 밝게 남았다.
    const { isNative } = useNative()
    if (isNative) {
      const colorMode = useColorMode()
      watch(() => colorMode.value, async (mode) => {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light })
        await StatusBar.setBackgroundColor({ color: mode === 'dark' ? '#1b1814' : '#FFF8EB' })
      }, { immediate: true })
    }
  },
})
