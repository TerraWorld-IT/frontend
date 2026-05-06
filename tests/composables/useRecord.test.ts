// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

describe('useRecord contract', () => {
  it('exports useRecord function', async () => {
    const mod = await import('~/composables/useRecord')
    expect(typeof mod.useRecord).toBe('function')
  })
})
