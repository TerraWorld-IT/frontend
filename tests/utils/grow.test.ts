import { describe, it, expect } from 'vitest'
import {
  resolveSpiritStage,
  isGrowthLost,
  isGrowthComplete,
  stampCountOf,
  localDateKey,
  SPIRIT_STAGE_DEFAULTS,
} from '~/utils/grow'

describe('utils/grow', () => {
  describe('resolveSpiritStage (FE 기본 임계 10/20/30)', () => {
    it('0~9 도장은 수수께끼 정령', () => {
      expect(resolveSpiritStage(0, 30)).toEqual({ tier: 'mystery', label: '수수께끼 정령' })
      expect(resolveSpiritStage(9, 30)).toEqual({ tier: 'mystery', label: '수수께끼 정령' })
    })

    it('10~19 도장은 고양이 정령 1단계', () => {
      expect(resolveSpiritStage(10, 30)).toEqual({ tier: 'stage1', label: '고양이 정령 1단계' })
      expect(resolveSpiritStage(19, 30)).toEqual({ tier: 'stage1', label: '고양이 정령 1단계' })
    })

    it('20~29 도장은 고양이 정령 2단계', () => {
      expect(resolveSpiritStage(20, 30)).toEqual({ tier: 'stage2', label: '고양이 정령 2단계' })
      expect(resolveSpiritStage(29, 30)).toEqual({ tier: 'stage2', label: '고양이 정령 2단계' })
    })

    it('goal 이상이면 획득 — 라벨은 인자로 받은 이름(서버 nameKo)', () => {
      expect(resolveSpiritStage(30, 30)).toEqual({ tier: 'acquired', label: '고양이 정령' })
      expect(resolveSpiritStage(31, 30, undefined, '도마뱀 정령')).toEqual({ tier: 'acquired', label: '도마뱀 정령' })
    })

    it('서버 stages[] 가 있으면 FE 기본값 대신 그 임계·라벨을 쓴다', () => {
      const stages = [
        { stage: 3, threshold: 15, label: '서버 2단계' },
        { stage: 1, threshold: 0, label: '서버 알' },
        { stage: 2, threshold: 5, label: '서버 1단계' },
      ]
      expect(resolveSpiritStage(4, 30, stages).label).toBe('서버 알')
      expect(resolveSpiritStage(5, 30, stages).label).toBe('서버 1단계')
      expect(resolveSpiritStage(15, 30, stages)).toEqual({ tier: 'stage2', label: '서버 2단계' })
    })

    it('기본 임계 상수는 오름차순 3단계', () => {
      expect(SPIRIT_STAGE_DEFAULTS.map(s => s.threshold)).toEqual([0, 10, 20])
    })
  })

  describe('isGrowthLost / isGrowthComplete / stampCountOf', () => {
    it('cycleState 가 있으면 LOST 만 끊김으로 본다 (dormant 무시)', () => {
      expect(isGrowthLost({ cycleState: 'LOST', dormant: false })).toBe(true)
      expect(isGrowthLost({ cycleState: 'ACTIVE', dormant: true })).toBe(false)
    })

    it('cycleState 가 없으면 현행 dormant 호환', () => {
      expect(isGrowthLost({ dormant: true })).toBe(true)
      expect(isGrowthLost({ dormant: false })).toBe(false)
    })

    it('stampCount 가 effectiveProgress 보다 우선', () => {
      expect(stampCountOf({ stampCount: 12, effectiveProgress: 3 })).toBe(12)
      expect(stampCountOf({ effectiveProgress: 7 })).toBe(7)
    })

    it('COMPLETED 또는 goal 도달이면 달성', () => {
      expect(isGrowthComplete({ cycleState: 'COMPLETED', effectiveProgress: 0, goal: 30 })).toBe(true)
      expect(isGrowthComplete({ effectiveProgress: 30, goal: 30 })).toBe(true)
      expect(isGrowthComplete({ effectiveProgress: 29, goal: 30 })).toBe(false)
      expect(isGrowthComplete({ effectiveProgress: 0, goal: 0 })).toBe(false)
    })
  })

  it('localDateKey 는 YYYY-MM-DD (로컬 기준)', () => {
    expect(localDateKey(new Date(2026, 7, 4))).toBe('2026-08-04')
  })
})
