import { describe, it, expect } from 'vitest'
import type { TierCatalogResponse, TierInfo } from '@terraworld-it/openapi-frontend'
import { toJarLevels, activeJarLevel, spiritNameKo, MAX_JAR_LEVEL } from '~/utils/tierLevels'

// 아프젝 v2 카탈로그(3레벨 루비 전용) — TierInfo.level / descriptionKo / active 를 그대로 쓴다.
// 4번째 항목은 비활성 티어가 섞여 내려오는 경우를 가정한 방어 케이스.
function catalog(overrides: Partial<TierInfo>[] = []): TierCatalogResponse {
  const base: TierInfo[] = [
    { tier: 'GLASS_JAR', tierOrder: 1, level: 1, nameKo: '유리병', descriptionKo: '기본 유리병 테라리움 입니다.', sparkleCost: 0, rubyCost: 0, slots: 10, spiritCode: null, unlocked: true, active: true },
    { tier: 'LARGE_JAR', tierOrder: 2, level: 2, nameKo: '큰 병', descriptionKo: '언덕과 바위가 있는 오픈형 테라리움 입니다', sparkleCost: 0, rubyCost: 30, slots: 20, spiritCode: null, unlocked: false, active: false },
    { tier: 'GRAND_TANK', tierOrder: 3, level: 3, nameKo: '그랜드 탱크', descriptionKo: '케이스형 테라리움 입니다. 비둘기 정령이 함께 해금됩니다.', sparkleCost: 0, rubyCost: 50, slots: 40, spiritCode: 'pigeon', unlocked: false, active: false },
    { tier: 'HOUSE_TANK', tierOrder: 4, level: 4, nameKo: '하우스 탱크', descriptionKo: '비활성', sparkleCost: 0, rubyCost: 100, slots: 60, spiritCode: null, unlocked: false, active: false },
  ]
  return {
    currentTier: 'GLASS_JAR',
    activeTier: 'GLASS_JAR',
    highestUnlockedTier: 'GLASS_JAR',
    tiers: base.map((t, i) => ({ ...t, ...overrides[i] })),
  }
}

describe('toJarLevels', () => {
  it('카탈로그가 없으면 빈 배열', () => {
    expect(toJarLevels(null)).toEqual([])
    expect(toJarLevels(undefined)).toEqual([])
  })

  it('level 1~3 만 Lv1~3 으로 매핑하고 4번째 티어는 숨긴다', () => {
    const levels = toJarLevels(catalog())
    expect(levels.map(l => l.level)).toEqual([1, 2, 3])
    expect(levels.every(l => l.level <= MAX_JAR_LEVEL)).toBe(true)
    expect(levels.find(l => l.tier === 'HOUSE_TANK')).toBeUndefined()
  })

  it('level 기준으로 정렬한다 (tierOrder 가 아니라 level 이 SoT)', () => {
    const shuffled = catalog()
    shuffled.tiers = [shuffled.tiers[2]!, shuffled.tiers[0]!, shuffled.tiers[1]!, shuffled.tiers[3]!]
    expect(toJarLevels(shuffled).map(l => l.tier)).toEqual(['GLASS_JAR', 'LARGE_JAR', 'GRAND_TANK'])
  })

  it('루비 비용/슬롯/정령/설명은 카탈로그 값을 그대로 쓴다', () => {
    const [, lv2, lv3] = toJarLevels(catalog())
    expect(lv2).toMatchObject({ tier: 'LARGE_JAR', rubyCost: 30, slots: 20, spiritCode: null, descriptionKo: '언덕과 바위가 있는 오픈형 테라리움 입니다' })
    expect(lv3).toMatchObject({ tier: 'GRAND_TANK', rubyCost: 50, slots: 40, spiritCode: 'pigeon' })
    expect(lv3!.descriptionKo).toContain('비둘기 정령')
  })

  it('active 는 카탈로그 플래그 그대로 — 표시 병이 Lv2 면 Lv2 만 active', () => {
    const levels = toJarLevels(catalog([{ active: false }, { unlocked: true, active: true }]))
    expect(levels.map(l => l.active)).toEqual([false, true, false])
  })

  it('순차 해금 — prevUnlocked 는 직전 레벨의 해금 여부, Lv1 은 항상 해금', () => {
    const locked = toJarLevels(catalog([{ unlocked: false }]))
    expect(locked[0]!.unlocked).toBe(true)
    expect(locked[1]!.prevUnlocked).toBe(true)
    expect(locked[2]!.prevUnlocked).toBe(false)

    const lv2Unlocked = toJarLevels(catalog([{}, { unlocked: true }]))
    expect(lv2Unlocked[2]!.prevUnlocked).toBe(true)
  })
})

describe('activeJarLevel', () => {
  it('active 레벨을 돌려주고, 없으면(미로드/빈 목록) Lv1', () => {
    expect(activeJarLevel(toJarLevels(catalog()))).toBe(1)
    expect(activeJarLevel(toJarLevels(catalog([{ active: false }, { unlocked: true, active: true }])))).toBe(2)
    expect(activeJarLevel([])).toBe(1)
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
