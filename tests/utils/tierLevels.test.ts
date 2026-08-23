import { describe, it, expect } from 'vitest'
import type { TierCatalogResponse } from '@terraworld-it/openapi-frontend'
import { toJarLevels, spiritNameKo, TIER_LEVEL_DESCRIPTIONS, MAX_JAR_LEVEL } from '~/utils/tierLevels'

// 현행 4티어 카탈로그(반짝이+루비) — FE 는 tierOrder 1~3 만 Lv1~3 으로 쓰고 4번째는 숨긴다.
function catalog(overrides: Partial<TierCatalogResponse['tiers'][number]>[] = []): TierCatalogResponse {
  const base = [
    { tier: 'GLASS_JAR', tierOrder: 1, nameKo: '유리병', sparkleCost: 0, rubyCost: 0, slots: 10, spiritCode: null, unlocked: true },
    { tier: 'LARGE_JAR', tierOrder: 2, nameKo: '큰 병', sparkleCost: 0, rubyCost: 30, slots: 20, spiritCode: null, unlocked: false },
    { tier: 'GRAND_TANK', tierOrder: 3, nameKo: '그랜드 탱크', sparkleCost: 0, rubyCost: 50, slots: 40, spiritCode: 'pigeon', unlocked: false },
    { tier: 'HOUSE_TANK', tierOrder: 4, nameKo: '하우스 탱크', sparkleCost: 0, rubyCost: 100, slots: 60, spiritCode: null, unlocked: false },
  ]
  return {
    currentTier: 'GLASS_JAR',
    tiers: base.map((t, i) => ({ ...t, ...overrides[i] })),
  }
}

describe('toJarLevels', () => {
  it('카탈로그가 없으면 빈 배열', () => {
    expect(toJarLevels(null)).toEqual([])
    expect(toJarLevels(undefined)).toEqual([])
  })

  it('tierOrder 1~3 만 Lv1~3 으로 매핑하고 4번째 티어는 숨긴다', () => {
    const levels = toJarLevels(catalog())
    expect(levels.map(l => l.level)).toEqual([1, 2, 3])
    expect(levels.every(l => l.level <= MAX_JAR_LEVEL)).toBe(true)
    expect(levels.find(l => l.tier === 'HOUSE_TANK')).toBeUndefined()
  })

  it('루비 비용/슬롯/정령은 카탈로그 값을 그대로 쓴다', () => {
    const [, lv2, lv3] = toJarLevels(catalog())
    expect(lv2).toMatchObject({ tier: 'LARGE_JAR', rubyCost: 30, slots: 20, spiritCode: null })
    expect(lv3).toMatchObject({ tier: 'GRAND_TANK', rubyCost: 50, slots: 40, spiritCode: 'pigeon' })
  })

  it('descriptionKo 가 없으면 레벨별 폴백 카피, 있으면 서버 값 우선', () => {
    const fallback = toJarLevels(catalog())
    expect(fallback[1]!.descriptionKo).toBe(TIER_LEVEL_DESCRIPTIONS[2])
    expect(fallback[2]!.descriptionKo).toBe(TIER_LEVEL_DESCRIPTIONS[3])

    const withServer = toJarLevels(catalog([{}, { descriptionKo: '서버 설명' } as never]))
    expect(withServer[1]!.descriptionKo).toBe('서버 설명')
  })

  it('순차 해금 — prevUnlocked 는 직전 레벨의 해금 여부, Lv1 은 항상 해금', () => {
    const locked = toJarLevels(catalog([{ unlocked: false }]))
    expect(locked[0]!.unlocked).toBe(true)
    expect(locked[1]!.prevUnlocked).toBe(true)
    expect(locked[2]!.prevUnlocked).toBe(false)

    const lv2Unlocked = toJarLevels(catalog([{}, { unlocked: true }]))
    expect(lv2Unlocked[2]!.prevUnlocked).toBe(true)
  })

  it('스펙 초안의 level 필드가 오면 tierOrder 대신 그 값을 쓴다', () => {
    const levels = toJarLevels(catalog([{ level: 1 } as never, { level: 2 } as never, { level: 3 } as never, { level: 4 } as never]))
    expect(levels.map(l => l.level)).toEqual([1, 2, 3])
  })
})

describe('spiritNameKo', () => {
  it('알려진 코드는 한글 이름, 없으면 "새로운"', () => {
    expect(spiritNameKo('pigeon')).toBe('비둘기')
    expect(spiritNameKo('PIGEON-SPIRIT')).toBe('비둘기')
    expect(spiritNameKo('cat-spirit')).toBe('고양이')
    expect(spiritNameKo('unknown')).toBe('새로운')
    expect(spiritNameKo(null)).toBe('새로운')
  })
})
