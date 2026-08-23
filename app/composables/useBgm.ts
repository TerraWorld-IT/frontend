/**
 * 힐링 모드 BGM composable (아프젝 T2).
 *
 * - 음원은 runtimeConfig `public.bgmUrl`(env `NUXT_PUBLIC_BGM_URL`) — 비어 있으면 **무음 플레이스홀더**
 *   (오디오 엘리먼트를 만들지 않고 ON/OFF 상태만 관리한다. 음원은 디자이너/사용자 제공 대기).
 * - ON/OFF 선호는 localStorage(`tw-bgm-enabled`) 에 기억해 다음 진입 시 그대로 복원한다.
 * - 페이지 이탈(unmount) 시 반드시 정지 — 오디오가 홈을 떠난 뒤에도 울리지 않게 한다.
 * - 모든 DOM/Audio 접근은 클라이언트 한정 (SSR 안전).
 */
export const BGM_STORAGE_KEY = 'tw-bgm-enabled'

export function useBgm() {
  const src: string = String((useRuntimeConfig().public as { bgmUrl?: string }).bgmUrl ?? '')
  /** 음원이 설정돼 있는지 — false 면 토글은 상태만 바뀌고 실제 재생은 없다(무음 플레이스홀더). */
  const hasSource: boolean = src.length > 0

  const enabled = ref<boolean>(true)
  const playing = ref<boolean>(false)
  let audio: HTMLAudioElement | null = null
  let restored = false

  /** localStorage 선호 복원 — 1회, 클라이언트에서만. 접근 실패(프라이빗 모드 등)는 기본값 유지. */
  function restore(): void {
    if (restored || !import.meta.client) return
    restored = true
    try {
      const raw = localStorage.getItem(BGM_STORAGE_KEY)
      if (raw === '0') enabled.value = false
      else if (raw === '1') enabled.value = true
    }
    catch {
      // 저장소 접근 불가 — 기본값(ON) 유지
    }
  }

  function persist(): void {
    if (!import.meta.client) return
    try {
      localStorage.setItem(BGM_STORAGE_KEY, enabled.value ? '1' : '0')
    }
    catch {
      // 저장 실패는 무시 — 세션 내 상태는 유지된다
    }
  }

  function ensureAudio(): HTMLAudioElement | null {
    if (!import.meta.client || !hasSource) return null
    if (!audio) {
      audio = new Audio(src)
      audio.loop = true
      audio.preload = 'auto'
    }
    return audio
  }

  /** 재생 시작 — OFF 상태면 아무것도 하지 않는다. 자동재생 차단(NotAllowedError)은 조용히 무시. */
  async function play(): Promise<void> {
    restore()
    if (!enabled.value) return
    const el = ensureAudio()
    if (!el) return
    try {
      await el.play()
      playing.value = true
    }
    catch {
      // 사용자 제스처 전 자동재생 차단 — 토글 탭 시 재시도된다
      playing.value = false
    }
  }

  /** 정지 + 처음으로 되감기. */
  function stop(): void {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    playing.value = false
  }

  /** ON/OFF 토글 — 선호 저장 + 즉시 재생/정지 반영. */
  async function toggle(): Promise<void> {
    restore()
    enabled.value = !enabled.value
    persist()
    if (enabled.value) await play()
    else stop()
  }

  onMounted(restore)
  onBeforeUnmount(() => {
    stop()
    audio = null
  })

  return { enabled: readonly(enabled), playing: readonly(playing), hasSource, play, stop, toggle }
}
