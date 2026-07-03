// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

/**
 * useParticleEffect 는 시간대(KST) + 테라리움 티어로 파티클을 자동 결정한다.
 * (낙서장 리팩토링: 구 '진화 단계' → 티어 GLASS_JAR/LARGE_JAR/GRAND_TANK/HOUSE_TANK)
 *
 * resolveParticleEffect 는 순수 함수라 Nuxt 환경 없이 직접 검증한다 (분기 로직 본체).
 * useParticleEffect 팩토리는 useIntervalFn auto-import 의존이라 nuxt 환경에서 contract +
 * 초기 autoEffect 값만 확인한다. 1분 tick 갱신 동작은 통합/타이머 테스트 영역.
 */
describe('resolveParticleEffect (순수 함수 분기)', () => {
  it('수중형 티어(대형 탱크)는 시간 무관 bubble', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    // 낮(12시)이어도 수중형 티어면 bubble 우선
    expect(resolveParticleEffect({ hour: 12, tier: 'GRAND_TANK' })).toBe('bubble')
    expect(resolveParticleEffect({ hour: 3, tier: 'HOUSE_TANK' })).toBe('bubble')
  })

  it('밤(18:00~06:00) 비수중 티어는 firefly', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    expect(resolveParticleEffect({ hour: 5, tier: 'GLASS_JAR' })).toBe('firefly')
    expect(resolveParticleEffect({ hour: 18, tier: 'LARGE_JAR' })).toBe('firefly')
    expect(resolveParticleEffect({ hour: 23, tier: null })).toBe('firefly')
  })

  it('낮(06:00~18:00) 비수중 티어는 off (날씨 API 미도입)', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    expect(resolveParticleEffect({ hour: 6, tier: 'GLASS_JAR' })).toBe('off')
    expect(resolveParticleEffect({ hour: 12, tier: null })).toBe('off')
    expect(resolveParticleEffect({ hour: 17, tier: undefined })).toBe('off')
  })

  it('경계값 — 06:00 은 낮(off), 18:00 은 밤(firefly)', async () => {
    const { resolveParticleEffect } = await import('~/composables/useParticleEffect')
    expect(resolveParticleEffect({ hour: 6, tier: null })).toBe('off')
    expect(resolveParticleEffect({ hour: 18, tier: null })).toBe('firefly')
  })
})

describe('useParticleEffect (factory)', () => {
  it('exports useParticleEffect + resolveParticleEffect', async () => {
    const mod = await import('~/composables/useParticleEffect')
    expect(typeof mod.useParticleEffect).toBe('function')
    expect(typeof mod.resolveParticleEffect).toBe('function')
  })

  it('autoEffect 는 티어 + 현재 KST 시간 기반 ParticleEffect 를 반환한다', async () => {
    const { ref } = await import('vue')
    const { useParticleEffect } = await import('~/composables/useParticleEffect')
    // 수중형 티어는 시간과 무관하게 항상 bubble — 결정적으로 검증 가능
    const tier = ref<string | null | undefined>('HOUSE_TANK')
    const { autoEffect, resolveParticleEffect } = useParticleEffect(tier)
    expect(autoEffect.value).toBe('bubble')
    // factory 가 동일한 순수 함수를 노출하는지
    expect(typeof resolveParticleEffect).toBe('function')
  })
})
