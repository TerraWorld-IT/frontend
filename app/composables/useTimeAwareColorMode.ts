/**
 * 시간대에 따라 color-mode 를 자동 전환.
 * - 06:00~18:00 (KST 기준): light
 * - 18:00~06:00 (KST 기준): dark
 *
 * UltraPlan v3 H-EXP-001 + J-DARK-001 (2026-05-18):
 * Codex pre-audit J-DARK-001 — `new Date().getHours()` 만 사용 = client local timezone.
 * 권장 default (§4.2.A 자율 진행): **서버 KST 고정**. 사용자가 일본·미국 timezone 에 있어도
 * 한국 시간 기준 light/dark 전환. EN/JA 시장 진입 시 (Phase 5+) 재검토.
 *
 * 사용자가 직접 `preference` 를 지정한 경우 (localStorage 에 'light' / 'dark' 로 고정)
 * 자동 전환을 하지 않는다. preference === 'system' 일 때만 동작.
 *
 * plugins/colorMode.client.ts 또는 layouts/default.vue 의 onMounted 에서 `autoToggle()` 호출.
 */

const DAY_START_HOUR = 6
const NIGHT_START_HOUR = 18
const KST_OFFSET_HOURS = 9

/**
 * KST (UTC+9) 기준 hour 계산.
 * client timezone 무관 — 항상 한국 시간 기준 light/dark 결정.
 */
function getKstHour(date: Date = new Date()): number {
  const utcHours = date.getUTCHours()
  return (utcHours + KST_OFFSET_HOURS) % 24
}

export function useTimeAwareColorMode() {
  const colorMode = useColorMode()

  function resolveByTime(date: Date = new Date()): 'light' | 'dark' {
    // UltraPlan v3 H-EXP timezone 정책 — KST 고정 (Codex post-audit O-DARKMODE 정합)
    const hour = getKstHour(date)
    return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'light' : 'dark'
  }

  /**
   * preference 가 'system' 일 때만 시간 기반으로 value 를 맞춘다.
   * 이미 light/dark 로 고정된 사용자 선호를 덮어쓰지 않는다.
   */
  function autoToggle() {
    if (!import.meta.client) return
    if (colorMode.preference !== 'system') return
    colorMode.value = resolveByTime()
  }

  /**
   * 주기적으로 체크해 경계 시간 (06:00 / 18:00) 을 지날 때 자동 전환.
   * 반환값은 interval id — onUnmounted 에서 clearInterval 할 수 있다.
   */
  function startAutoToggle(intervalMs: number = 10 * 60 * 1000): number | null {
    if (!import.meta.client) return null
    autoToggle()
    return window.setInterval(autoToggle, intervalMs) as unknown as number
  }

  return {
    resolveByTime,
    autoToggle,
    startAutoToggle,
  }
}
