import type { GrowthItem } from '@terraworld-it/openapi-frontend'

/**
 * 키우기(정령) 표시 유틸 — 아프젝 v2 Figma(2026-08-21) G2/G3/G4 정합.
 *
 * 서버 계약(N-B6, `2026-08-23-apjek-v2-api-contract.md` §6)은 아직 스펙·백엔드 미구현이라
 * 현행 SDK 의 `GrowthItem` 위에 **선택 필드**로 확장해 두고, 값이 없으면 FE 기본값으로 폴백한다.
 * 스펙 머지 후에는 SDK 타입이 이 필드들을 직접 제공하므로 확장 타입은 제거 대상이다.
 */

/** 서버 단계 정의(N-B6 `GrowthStage`) — 스펙 머지 전 FE 선언. */
export interface GrowthStageDef {
  stage: number
  threshold: number
  label: string
}

// TODO(N-B6 스펙 머지 후): SDK GrowthItem 이 아래 필드를 직접 제공하면 이 확장 타입을 제거한다.
export type GrowthItemV2 = GrowthItem & {
  /** ACTIVE(진행) / LOST(기록 끊김) / COMPLETED(30 달성) */
  cycleState?: 'ACTIVE' | 'LOST' | 'COMPLETED'
  /** effectiveProgress 별칭(도장 수) */
  stampCount?: number
  /** 서버 단계표 — 있으면 FE 임계 대신 이것을 쓴다 */
  stages?: GrowthStageDef[]
  /** 30 달성 당일 여부(토스트 하루 유지용) */
  completedToday?: boolean
  /** "알림받기" 신청 여부 */
  notifyNext?: boolean
  /** 기록 끊김 복귀 루비 비용(기본 10) */
  reviveRubyCost?: number
}

/** 정령 단계 구분 — 수수께끼 / 1단계 / 2단계 / 획득(30 달성) */
export type SpiritTier = 'mystery' | 'stage1' | 'stage2' | 'acquired'

export interface SpiritStage {
  tier: SpiritTier
  label: string
}

/**
 * FE 기본 임계(§4 결정 기본값 10/20/30). 서버 `stages[]` 가 오면 그쪽이 우선한다.
 * TODO(G2 시드 변경 후 서버값 단일화): BE growth_stages 시드가 10/20/30 + 라벨로 바뀌면
 * 이 상수와 라벨을 지우고 서버 `stages[]` 만 쓴다.
 */
export const SPIRIT_STAGE_DEFAULTS: readonly GrowthStageDef[] = [
  { stage: 1, threshold: 0, label: '수수께끼 정령' },
  { stage: 2, threshold: 10, label: '고양이 정령 1단계' },
  { stage: 3, threshold: 20, label: '고양이 정령 2단계' },
]

/** 30 달성(획득) 시 라벨 — 서버 nameKo 가 있으면 그 이름을 쓰고, 없으면 기본 */
export const SPIRIT_ACQUIRED_LABEL = '고양이 정령'

/** 루비 복귀 기본 비용 (계약 §6 reviveRubyCost 기본 10) */
export const REVIVE_RUBY_COST_DEFAULT = 10

/** 반짝이 교환 1회 비용 / 도장 증가량 (계약 SoT: POST /growth/{speciesCode}/booster) */
export const BOOSTER_COST = 100
export const BOOSTER_STAMPS = 10

/** 도장 수 — 서버 stampCount 가 있으면 우선, 없으면 effectiveProgress */
export function stampCountOf(c: Pick<GrowthItemV2, 'stampCount' | 'effectiveProgress'>): number {
  return Math.max(0, Math.floor(c.stampCount ?? c.effectiveProgress ?? 0))
}

/** 30 달성 판정 — goal 은 서버 값(하드코딩 금지) */
export function isGrowthComplete(c: Pick<GrowthItemV2, 'cycleState' | 'stampCount' | 'effectiveProgress' | 'goal'>): boolean {
  if (c.cycleState === 'COMPLETED') return true
  return c.goal > 0 && stampCountOf(c) >= c.goal
}

/** 기록 끊김(LOST) 판정 — 신규 cycleState 우선, 없으면 현행 dormant 호환 */
export function isGrowthLost(c: Pick<GrowthItemV2, 'cycleState' | 'dormant'>): boolean {
  if (c.cycleState) return c.cycleState === 'LOST'
  return c.dormant === true
}

/**
 * 도장 수 기준 정령 단계 라벨.
 * - 0~9 수수께끼 정령 / 10~19 고양이 정령 1단계 / 20~29 고양이 정령 2단계 / goal 이상 획득.
 * - 서버 `stages[]` 가 있으면 그 임계·라벨을 우선한다(threshold 오름차순 중 stamps 이하 최대값).
 */
export function resolveSpiritStage(
  stamps: number,
  goal: number,
  stages?: readonly GrowthStageDef[] | null,
  acquiredLabel: string = SPIRIT_ACQUIRED_LABEL,
): SpiritStage {
  const table: readonly GrowthStageDef[] = stages && stages.length > 0
    ? [...stages].sort((a, b) => a.threshold - b.threshold)
    : SPIRIT_STAGE_DEFAULTS
  if (goal > 0 && stamps >= goal) return { tier: 'acquired', label: acquiredLabel }

  let idx = 0
  for (let i = 0; i < table.length; i++) {
    if (stamps >= (table[i]?.threshold ?? 0)) idx = i
  }
  const entry = table[idx] ?? table[0]
  const label = entry?.label ?? SPIRIT_STAGE_DEFAULTS[0]!.label
  // 단계 순번 → 시각 티어 매핑(첫 구간=수수께끼, 둘째=1단계, 그 이후=2단계)
  const tier: SpiritTier = idx === 0 ? 'mystery' : idx === 1 ? 'stage1' : 'stage2'
  return { tier, label }
}

/** 로컬 날짜 키(YYYY-MM-DD) — 달성 토스트 "하루 유지" 판정용 */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
