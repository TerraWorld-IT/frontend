import { describe, it, expect } from 'vitest'

describe('useToast contract', () => {
  it('exports useToast function', async () => {
    const mod = await import('~/composables/useToast')
    expect(mod).toHaveProperty('useToast')
    expect(typeof mod.useToast).toBe('function')
  })
})
