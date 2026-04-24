/**
 * 시들기 연출 매핑. 백엔드 TerrariumResponse.wilting 을 받아
 * 화면에 적용할 시각 힌트 (filter, 오버레이 메시지, show flag) 로 변환.
 *
 * 백엔드가 wilting 을 반환하지 않는 경우 (스펙/SDK 재생성 전) stage=0 으로 간주.
 * P-4 단계는 정적 연출만 수행 — 광고 보상 복구는 Phase 2 (backend /rewards/ad 연동).
 */

export interface WiltingState {
  stage: 0 | 1 | 2 | 3
  daysSinceRecord: number | null
}

export interface WiltingVisual {
  stage: 0 | 1 | 2 | 3
  /** CSS filter 값. jar 이미지에 적용. */
  filter: string
  /** 오버레이 메시지. stage 0 이면 null. */
  message: string | null
  /** 추가 CSS 클래스 (애니메이션 등). */
  extraClass: string
  /** 오버레이 노출 여부. */
  showOverlay: boolean
}

const STAGE_MAP: Record<WiltingState['stage'], Omit<WiltingVisual, 'stage'>> = {
  0: {
    filter: 'none',
    message: null,
    extraClass: '',
    showOverlay: false,
  },
  1: {
    filter: 'saturate(0.78)',
    message: '오늘 기록이 비어 있어요',
    extraClass: '',
    showOverlay: true,
  },
  2: {
    filter: 'saturate(0.52) brightness(0.96)',
    message: '물 좀 줘…',
    extraClass: '',
    showOverlay: true,
  },
  3: {
    filter: 'saturate(0.32) brightness(0.9)',
    message: '위기: 기록이 필요해요',
    extraClass: 'animate-pulse',
    showOverlay: true,
  },
}

export function useWilting(source: Ref<WiltingState | null | undefined>) {
  const visual = computed<WiltingVisual>(() => {
    const s = source.value?.stage ?? 0
    const stage = (s >= 0 && s <= 3 ? s : 0) as WiltingState['stage']
    return { stage, ...STAGE_MAP[stage] }
  })

  return { visual }
}
