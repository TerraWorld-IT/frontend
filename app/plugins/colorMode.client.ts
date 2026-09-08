/**
 * color-mode 의 preference 가 'system' 일 때만 시간대 기반 자동 전환을 수행.
 * - 페이지 진입 시 1회 즉시 반영
 * - 10분마다 주기 체크 (경계 시각 06:00 / 18:00 근처에서 자동 스위칭)
 */
// 계산값을 못 읽었을 때의 폴백 — tailwind.css 의 --color-apjek-surface 실제 값(라이트/다크).
const SURFACE_FALLBACK = { light: '#ffffff', dark: '#262019' }

function readSurfaceColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-apjek-surface').trim()
}

export default defineNuxtPlugin({
  name: 'time-aware-color-mode',
  parallel: true,
  setup() {
    const { startAutoToggle } = useTimeAwareColorMode()
    const id = startAutoToggle()

    if (id !== null) {
      window.addEventListener('beforeunload', () => window.clearInterval(id), { once: true })
    }

    // 스크림과 동일한 계산 토큰으로 웹 메타와 네이티브 상태바를 함께 갱신한다.
    // theme-color 는 DOM 직접 수정 대신 useHead 반응형 ref 로 관리한다 — DOM 을 직접 고치면
    // unhead 가 다시 렌더할 때 nuxt.config 의 정적 값으로 되돌아간다. name 이 같아 dedupe 되므로
    // 태그는 1개뿐이다(nuxt.config 의 같은 항목을 덮어쓴다).
    const { isNative } = useNative()
    const colorMode = useColorMode()
    const themeColor = ref<string>(SURFACE_FALLBACK.light)
    useHead({ meta: [{ name: 'theme-color', content: themeColor }] })

    watch(() => colorMode.value, async (mode) => {
      await nextTick()
      let color = readSurfaceColor()
      // 첫 적용 시점에는 계산값이 아직 비어 있을 수 있다 — 다음 프레임에 1회만 재시도한다.
      if (!color) color = await new Promise<string>(resolve => requestAnimationFrame(() => resolve(readSurfaceColor())))
      if (!color) color = mode === 'dark' ? SURFACE_FALLBACK.dark : SURFACE_FALLBACK.light
      themeColor.value = color
      if (!isNative) return
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      if (mode !== colorMode.value) return
      await StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light })
      await StatusBar.setBackgroundColor({ color })
    }, { immediate: true, flush: 'post' })
  },
})
