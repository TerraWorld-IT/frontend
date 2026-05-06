// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

describe('useEvolution', () => {
  it('exports useEvolution and EVOLUTION_STAGE_META', async () => {
    const mod = await import('~/composables/useEvolution')
    expect(typeof mod.useEvolution).toBe('function')
    expect(mod.EVOLUTION_STAGE_META).toBeDefined()
  })

  it('EVOLUTION_STAGE_META covers all 5 stages with monotonic unlockLevel', async () => {
    const { EVOLUTION_STAGE_META } = await import('~/composables/useEvolution')
    const stages = ['POT', 'BOTTLE', 'PALUDARIUM', 'WORLD', 'CUSTOM'] as const
    for (const s of stages) {
      const meta = EVOLUTION_STAGE_META[s]
      expect(meta).toBeDefined()
      expect(typeof meta.label).toBe('string')
      expect(typeof meta.description).toBe('string')
      expect(meta.unlockLevel).toBeGreaterThan(0)
    }
    // 진화 단계 unlockLevel 은 단조 증가여야 함 (1 < 5 < 10 < 20 < 30)
    const levels = stages.map(s => EVOLUTION_STAGE_META[s].unlockLevel)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]!)
    }
  })

  it('isUnlocked returns false when terrarium is null', async () => {
    const { useEvolution } = await import('~/composables/useEvolution')
    const { isUnlocked } = useEvolution()
    expect(isUnlocked(null, 'BOTTLE' as never)).toBe(false)
    expect(isUnlocked(undefined, 'BOTTLE' as never)).toBe(false)
  })

  it('isUnlocked uses terrarium.unlockedStages list', async () => {
    const { useEvolution } = await import('~/composables/useEvolution')
    const { isUnlocked } = useEvolution()
    const terrarium = {
      unlockedStages: ['POT', 'BOTTLE'] as readonly unknown[],
    } as never
    expect(isUnlocked(terrarium, 'BOTTLE' as never)).toBe(true)
    expect(isUnlocked(terrarium, 'WORLD' as never)).toBe(false)
  })
})
