import { describe, it, expect } from 'vitest'

/**
 * useTimeAwareColorMode 는 시간대(06:00~18:00) 에 따라 light/dark 자동 전환한다.
 *
 * useColorMode auto-import 의존이라 behavior test 는 @nuxt/test-utils 환경 필요.
 * 본 contract 테스트는 module shape 만 검증.
 *
 * 경계값 (06:00 / 18:00) 동작은 통합 테스트로 위임 — 단위 테스트 단계에서는
 * 함수 시그니처와 export 여부만 보장.
 */
describe('useTimeAwareColorMode contract', () => {
  it('exports useTimeAwareColorMode function', async () => {
    const mod = await import('~/composables/useTimeAwareColorMode')
    expect(mod).toHaveProperty('useTimeAwareColorMode')
    expect(typeof mod.useTimeAwareColorMode).toBe('function')
  })
})
