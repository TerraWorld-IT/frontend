import { describe, it, expect } from 'vitest'

/**
 * useParticleEffect 의 순수 분기 함수 resolveParticleEffect 를 검증한다.
 * (시간대 + 진화 단계 → 파티클 자동 결정. reactive/Date tick 동작은 통합 테스트 영역.)
 *
 * 분기 (구현 기준):
 *  - 수중 진화(PALUDARIUM/WORLD/CUSTOM) → bubble (시간 무관)
 *  - 밤(hour < 6 || hour >= 18) + 비수중 → firefly
 *  - 낮(6~17) + 비수중 → off
 */
describe('resolveParticleEffect', () => {
  it('exports resolveParticleEffect 순수 함수', async () => {
    const mod = await import('~/composables/useParticleEffect')
    expect(typeof mod.resolveParticleEffect).toBe('function')
  })

  it('수중 진화 단계는 시간과 무관하게 bubble', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    for (const stage of ['PALUDARIUM', 'WORLD', 'CUSTOM']) {
      expect(resolveParticleEffect({ hour: 3, evolutionStage: stage })).toBe('bubble')
      expect(resolveParticleEffect({ hour: 12, evolutionStage: stage })).toBe('bubble')
      expect(resolveParticleEffect({ hour: 22, evolutionStage: stage })).toBe('bubble')
    }
  })

  it('밤(비수중)은 firefly — 경계 5시/18시 포함', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    expect(resolveParticleEffect({ hour: 5, evolutionStage: 'POT' })).toBe('firefly')
    expect(resolveParticleEffect({ hour: 0, evolutionStage: 'BOTTLE' })).toBe('firefly')
    expect(resolveParticleEffect({ hour: 18, evolutionStage: null })).toBe('firefly')
    expect(resolveParticleEffect({ hour: 23, evolutionStage: undefined })).toBe('firefly')
  })

  it('낮(비수중)은 off — 경계 6시/17시 포함', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    expect(resolveParticleEffect({ hour: 6, evolutionStage: 'POT' })).toBe('off')
    expect(resolveParticleEffect({ hour: 12, evolutionStage: null })).toBe('off')
    expect(resolveParticleEffect({ hour: 17, evolutionStage: undefined })).toBe('off')
  })

  it('수중 단계가 밤/낮 분기보다 우선', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    // 밤이지만 수중 → firefly 아닌 bubble
    expect(resolveParticleEffect({ hour: 2, evolutionStage: 'WORLD' })).toBe('bubble')
  })
})
