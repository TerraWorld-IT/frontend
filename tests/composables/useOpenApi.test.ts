// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

describe('useOpenApi', () => {
  it('exports useOpenApi and castData', async () => {
    const mod = await import('~/composables/useOpenApi')
    expect(typeof mod.useOpenApi).toBe('function')
    expect(typeof mod.castData).toBe('function')
  })

  it('castData<T> returns the same reference (identity cast)', async () => {
    const { castData } = await import('~/composables/useOpenApi')
    const obj = { foo: 'bar', n: 42 }
    expect(castData<typeof obj>(obj)).toBe(obj)
  })

  it('castData<T>(undefined) returns undefined', async () => {
    const { castData } = await import('~/composables/useOpenApi')
    expect(castData<unknown>(undefined)).toBeUndefined()
  })

  it('castData<T> preserves nested structures', async () => {
    const { castData } = await import('~/composables/useOpenApi')
    interface Wrapper { categories: Array<{ id: number, name: string }> }
    const data: Wrapper = { categories: [{ id: 1, name: '산책' }, { id: 2, name: '독서' }] }
    const result = castData<Wrapper>(data)
    expect(result?.categories).toHaveLength(2)
    expect(result?.categories?.[0]?.name).toBe('산책')
  })
})
