import { describe, it, expect } from 'vitest'

/**
 * useAdMob 은 Capacitor native(Android) 에서만 실 광고. 웹/iOS dev 에서는 즉시 통과.
 * Capacitor.isNativePlatform 의존이라 behavior 테스트는 통합 환경 필요.
 *
 * 본 contract 테스트는 export 함수 시그니처 검증.
 */
describe('useAdMob contract', () => {
  it('exports useAdMob function', async () => {
    const mod = await import('~/composables/useAdMob')
    expect(mod).toHaveProperty('useAdMob')
    expect(typeof mod.useAdMob).toBe('function')
  })
})
