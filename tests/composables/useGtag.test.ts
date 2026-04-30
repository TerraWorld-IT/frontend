import { describe, it, expect } from 'vitest'

/**
 * useGtagEvents wraps nuxt-gtag's useGtag().
 * Full testing requires Nuxt environment. These verify module shape +
 * 신규 추가된 헬퍼들이 누락되지 않도록 export 회귀 방지.
 */
describe('useGtagEvents contract', () => {
  it('exports useGtagEvents function', async () => {
    const mod = await import('~/composables/useGtagEvents')
    expect(mod).toHaveProperty('useGtagEvents')
    expect(typeof mod.useGtagEvents).toBe('function')
  })
})
