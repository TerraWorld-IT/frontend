import type { GrowthItem, GrowthStage } from '@terraworld-it/openapi-frontend'
import { kstTodayKey } from '~/utils/habitState'

/**
 * 키우기(정령) 표시 유틸 — 아프젝 v2 Figma(2026-08-21) G2/G3/G4 정합.
 *
 * 서버 계약(N-B6 rev2 R3)의 `GrowthItem` 필드(cycleState / stampCount / stages / completedToday /
 * notifyNext / reviveRubyCost / reviveSnoozedUntil)가 SoT 다. 단계 임계·라벨은 서버 `stages[]` 만 쓴다.
 */

/** 정령 단계 구분 — 수수께끼 / 1단계 / 2단계 / 획득(goal 달성) */
export type SpiritTier = 'mystery' | 'stage1' | 'stage2' | 'acquired'

/** 공개 종의 단계 일러스트 — 미지원 코드는 기존 고양이 그림으로 표시한다. */
export function spiritImageSrc(code: string | null | undefined, tier?: SpiritTier): string {
  const stage = tier === 'stage1' ? 'stage1' : 'stage2'
  switch (code) {
    case 'dino':
    case 'squirrel':
    case 'snail':
    case 'otter':
    case 'axolotl':
    case 'rabbit':
      return `/spirits/${code}-${stage}.png`
    default:
      return `/spirits/${stage}.png`
  }
}

/** 공개된 종은 서버 이름으로 획득을 알리고, 이전 계약 응답은 기존 문구를 유지한다. */
export function growthCompletionMessage(c: Pick<GrowthItem, 'goal' | 'nameKo' | 'revealedSpiritCode'>): string {
  const name = (c.revealedSpiritCode && c.nameKo?.trim()) || '정령'
  const lastChar = name.charCodeAt(name.length - 1)
  const isHangul = lastChar >= 0xAC00 && lastChar <= 0xD7A3
  const particle = isHangul ? ((lastChar - 0xAC00) % 28 !== 0 ? '을' : '를') : '을(를)'
  return `${c.goal}개 달성! ${name}${particle} 획득했어요`
}

export interface SpiritStage {
  tier: SpiritTier
  label: string
}

/** goal 달성(획득) 시 라벨 폴백 — 서버 nameKo 가 비어 있을 때만 */
export const SPIRIT_ACQUIRED_LABEL = '고양이 정령'

/** 서버 stages[] 가 비어 있을 때의 최소 라벨(방어) — 임계는 두지 않는다 */
const MYSTERY_LABEL = '수수께끼 정령'

/** 반짝이 교환 1회 비용 / 도장 증가량 (계약 SoT: POST /growth/{speciesCode}/booster) */
export const BOOSTER_COST = 100
export const BOOSTER_STAMPS = 10

/** goal 달성 판정 — 서버 cycleState 가 SoT */
export function isGrowthComplete(c: Pick<GrowthItem, 'cycleState'>): boolean {
  return c.cycleState === 'COMPLETED'
}

/** 기록 끊김(LOST) 판정 — 서버 cycleState 가 SoT (`dormant` 는 하위호환 동치 필드) */
export function isGrowthLost(c: Pick<GrowthItem, 'cycleState'>): boolean {
  return c.cycleState === 'LOST'
}

/**
 * 되살리기 보류(revive-dismiss) 중인지 — `reviveSnoozedUntil`(KST 일자) 이 오늘(KST) 이후면 보류.
 * 보류 중에는 revive 가 409 GROWTH_REVIVE_SNOOZED 이고, 그 날짜가 되면 새 사이클로 리셋된다.
 */
export function isReviveSnoozed(c: Pick<GrowthItem, 'reviveSnoozedUntil'>, todayKey: string = kstTodayKey()): boolean {
  const until = c.reviveSnoozedUntil
  if (!until) return false
  return until.slice(0, 10) > todayKey
}

/**
 * 도장 수 기준 정령 단계 라벨 — 서버 `stages[]`(threshold 오름차순 중 stamps 이상인 최고 단계).
 * goal 이상이면 획득(acquired) — 라벨은 서버 nameKo.
 * 단계 순번 → 시각 티어 매핑: 첫 구간=수수께끼, 둘째=1단계, 그 이후=2단계.
 */
export function resolveSpiritStage(
  stamps: number,
  goal: number,
  stages: readonly GrowthStage[],
  acquiredLabel: string = SPIRIT_ACQUIRED_LABEL,
): SpiritStage {
  if (goal > 0 && stamps >= goal) return { tier: 'acquired', label: acquiredLabel || SPIRIT_ACQUIRED_LABEL }
  const table: readonly GrowthStage[] = [...stages].sort((a, b) => a.threshold - b.threshold)
  if (table.length === 0) return { tier: 'mystery', label: MYSTERY_LABEL }

  let idx = 0
  for (let i = 0; i < table.length; i++) {
    if (stamps >= (table[i]?.threshold ?? 0)) idx = i
  }
  const label = table[idx]?.label ?? MYSTERY_LABEL
  const tier: SpiritTier = idx === 0 ? 'mystery' : idx === 1 ? 'stage1' : 'stage2'
  return { tier, label }
}

/** 개체의 현재 단계 — `stampCount`/`goal`/`stages`/`nameKo`/`cycleState` 로 도출 */
export function spiritStageOf(c: Pick<GrowthItem, 'stampCount' | 'goal' | 'stages' | 'nameKo' | 'cycleState'>): SpiritStage {
  if (isGrowthComplete(c)) return { tier: 'acquired', label: c.nameKo || SPIRIT_ACQUIRED_LABEL }
  return resolveSpiritStage(c.stampCount, c.goal, c.stages, c.nameKo || SPIRIT_ACQUIRED_LABEL)
}
