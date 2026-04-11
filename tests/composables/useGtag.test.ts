import { describe, it, expect } from 'vitest'

/**
 * useGtagEvents wraps nuxt-gtag's useGtag().
 * Full testing requires Nuxt environment. These verify module shape.
 */
describe('useGtagEvents contract', () => {
  it('exports useGtagEvents function', async () => {
    const mod = await import('~/composables/useGtag')
    expect(mod).toHaveProperty('useGtagEvents')
    expect(typeof mod.useGtagEvents).toBe('function')
  })
})
