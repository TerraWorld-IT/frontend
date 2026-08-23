import { describe, it, expect } from 'vitest'
import type { GrowthItem, GrowthStage } from '@terraworld-it/openapi-frontend'
import {
  resolveSpiritStage,
  spiritStageOf,
  isGrowthLost,
  isGrowthComplete,
  isReviveSnoozed,
} from '~/utils/grow'

// 서버 기본 시드 (threshold 1 / 10 / 20, goal 30)
const STAGES: GrowthStage[] = [
  { stage: 1, threshold: 1, label: '수수께끼 정령' },
  { stage: 2, threshold: 10, label: '고양이 정령 1단계' },
  { stage: 3, threshold: 20, label: '고양이 정령 2단계' },
]

function item(over: Partial<GrowthItem> = {}): GrowthItem {
  return {
    speciesCode: 'cat',
    kind: 'SPIRIT',
    nameKo: '고양이 정령',
    currentStage: 1,
    stageLabel: '수수께끼 정령',
    effectiveProgress: 0,
    stampCount: 0,
    goal: 30,
    dormant: false,
    cycleId: 'cycle-1',
    cycleState: 'ACTIVE',
    stages: STAGES,
    reviveRubyCost: 10,
    completedToday: false,
    notifyNext: false,
    ...over,
  }
}

describe('utils/grow', () => {
  describe('resolveSpiritStage (서버 stages[] 기준)', () => {
    it('0~9 도장은 수수께끼 정령 (threshold 1 미만인 0 도 첫 구간)', () => {
      expect(resolveSpiritStage(0, 30, STAGES)).toEqual({ tier: 'mystery', label: '수수께끼 정령' })
      expect(resolveSpiritStage(9, 30, STAGES)).toEqual({ tier: 'mystery', label: '수수께끼 정령' })
    })

    it('10~19 도장은 고양이 정령 1단계', () => {
      expect(resolveSpiritStage(10, 30, STAGES)).toEqual({ tier: 'stage1', label: '고양이 정령 1단계' })
      expect(resolveSpiritStage(19, 30, STAGES)).toEqual({ tier: 'stage1', label: '고양이 정령 1단계' })
    })

    it('20~29 도장은 고양이 정령 2단계', () => {
      expect(resolveSpiritStage(20, 30, STAGES)).toEqual({ tier: 'stage2', label: '고양이 정령 2단계' })
      expect(resolveSpiritStage(29, 30, STAGES)).toEqual({ tier: 'stage2', label: '고양이 정령 2단계' })
    })

    it('goal 이상이면 획득 — 라벨은 인자로 받은 이름(서버 nameKo)', () => {
      expect(resolveSpiritStage(30, 30, STAGES)).toEqual({ tier: 'acquired', label: '고양이 정령' })
      expect(resolveSpiritStage(31, 30, STAGES, '도마뱀 정령')).toEqual({ tier: 'acquired', label: '도마뱀 정령' })
    })

    it('stages 순서가 섞여 있어도 threshold 오름차순으로 판정한다', () => {
      const shuffled = [
        { stage: 3, threshold: 15, label: '서버 2단계' },
        { stage: 1, threshold: 0, label: '서버 알' },
        { stage: 2, threshold: 5, label: '서버 1단계' },
      ]
      expect(resolveSpiritStage(4, 30, shuffled).label).toBe('서버 알')
      expect(resolveSpiritStage(5, 30, shuffled).label).toBe('서버 1단계')
      expect(resolveSpiritStage(15, 30, shuffled)).toEqual({ tier: 'stage2', label: '서버 2단계' })
    })

    it('stages 가 비어 있으면 임계 없이 수수께끼 라벨만 (FE 임계 폴백 없음)', () => {
      expect(resolveSpiritStage(25, 30, [])).toEqual({ tier: 'mystery', label: '수수께끼 정령' })
    })
  })

  describe('spiritStageOf', () => {
    it('cycleState=COMPLETED 면 도장 수와 무관하게 획득(nameKo)', () => {
      expect(spiritStageOf(item({ cycleState: 'COMPLETED', stampCount: 30 }))).toEqual({ tier: 'acquired', label: '고양이 정령' })
    })

    it('진행 중이면 stampCount 로 stages 판정', () => {
      expect(spiritStageOf(item({ stampCount: 12 }))).toEqual({ tier: 'stage1', label: '고양이 정령 1단계' })
    })
  })

  describe('isGrowthLost / isGrowthComplete / isReviveSnoozed', () => {
    it('cycleState 가 SoT — LOST 만 끊김, COMPLETED 만 달성', () => {
      expect(isGrowthLost(item({ cycleState: 'LOST' }))).toBe(true)
      expect(isGrowthLost(item({ cycleState: 'ACTIVE', dormant: true }))).toBe(false)
      expect(isGrowthComplete(item({ cycleState: 'COMPLETED' }))).toBe(true)
      expect(isGrowthComplete(item({ stampCount: 30 }))).toBe(false)
    })

    it('reviveSnoozedUntil 이 오늘(KST) 이후면 보류, null 이거나 지났으면 아님', () => {
      expect(isReviveSnoozed(item({ reviveSnoozedUntil: '2026-08-24' }), '2026-08-23')).toBe(true)
      expect(isReviveSnoozed(item({ reviveSnoozedUntil: '2026-08-23' }), '2026-08-23')).toBe(false)
      expect(isReviveSnoozed(item({ reviveSnoozedUntil: null }), '2026-08-23')).toBe(false)
      expect(isReviveSnoozed(item(), '2026-08-23')).toBe(false)
    })
  })
})
