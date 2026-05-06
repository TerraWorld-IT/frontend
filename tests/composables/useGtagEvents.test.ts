// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

/**
 * useGtagEvents 는 nuxt-gtag 의 useGtag() 를 thin-wrap 한다.
 * 본 파일은 모듈 export 가 깨지지 않게 보호하는 smoke 만.
 */
describe('useGtagEvents contract', () => {
  it('exports useGtagEvents function', async () => {
    const mod = await import('~/composables/useGtagEvents')
    expect(typeof mod.useGtagEvents).toBe('function')
  })
})
