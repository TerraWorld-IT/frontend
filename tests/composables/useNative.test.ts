// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

/**
 * useNative 는 Capacitor.isNativePlatform() 분기로 native 환경에서만 실제
 * 액션을 수행. 테스트는 web/SSR 분기만 검증 — native 분기는 e2e 또는 별도
 * Capacitor mock 환경 필요.
 */
describe('useNative contract', () => {
  it('exports useNative function', async () => {
    const mod = await import('~/composables/useNative')
    expect(typeof mod.useNative).toBe('function')
  })
})
