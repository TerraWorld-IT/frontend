export interface LayoutVariant {
  id: string
  emoji: string
  name: string
  desc: string
}

export const LAYOUT_VARIANTS: LayoutVariant[] = [
  { id: 'jar', emoji: '🫧', name: 'Jar View', desc: '유리병 속 세상 — 테라리움이 중심' },
  { id: 'postcard', emoji: '💌', name: 'Postcard', desc: '오늘의 엽서 — 하루를 카드로 기록' },
  { id: 'shelf', emoji: '📚', name: 'Cozy Shelf', desc: '나의 선반 — 책장 속 아늑한 공간' },
  { id: 'window', emoji: '🪟', name: 'Window', desc: '창가의 아침 — 시간에 따라 변하는 풍경' },
  { id: 'garden', emoji: '🗺️', name: 'Garden Map', desc: '나의 정원 지도 — 기록이 꽃으로 피어남' },
  { id: 'storybook', emoji: '📖', name: 'Storybook', desc: '동화책 — 매일이 새로운 챕터' },
  { id: 'windowsill', emoji: '🪴', name: 'Windowsill', desc: '창틀 위 화분 — 산소 버블이 올라오는 정원' },
  { id: 'bubble', emoji: '💧', name: 'Bubble Pop', desc: '방울 세상 — 둥글둥글 떠다니는 기록들' },
]

const _current = ref(0)
let initialized = false

/**
 * 전역 레이아웃 컨셉 셀렉터
 * - 모든 페이지에서 동일한 컨셉 인덱스를 공유
 * - localStorage에 저장하여 새로고침/페이지 이동 후에도 유지
 */
export function useLayoutVariant() {
  if (import.meta.client && !initialized) {
    const saved = localStorage.getItem('tw-layout')
    if (saved !== null) {
      const idx = parseInt(saved, 10)
      if (idx >= 0 && idx < LAYOUT_VARIANTS.length) {
        _current.value = idx
      }
    }
    initialized = true
  }

  const current = computed({
    get: () => _current.value,
    set: (val: number) => {
      _current.value = val
      if (import.meta.client) {
        localStorage.setItem('tw-layout', String(val))
      }
    },
  })

  const currentLayout = computed(() => LAYOUT_VARIANTS[current.value])

  /** 컨셉 ID로 비교 (v-if에서 사용) */
  function is(id: string): boolean {
    return LAYOUT_VARIANTS[current.value]?.id === id
  }

  return {
    layouts: LAYOUT_VARIANTS,
    current,
    currentLayout,
    is,
  }
}
