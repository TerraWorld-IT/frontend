// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

describe('useCustomCategory contract', () => {
  it('exports useCustomCategory function', async () => {
    const mod = await import('~/composables/useCustomCategory')
    expect(typeof mod.useCustomCategory).toBe('function')
  })
})
