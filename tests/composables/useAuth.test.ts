import { afterEach, describe, it, expect, vi } from 'vitest'

afterEach(async () => {
  const { useAuth } = await import('~/composables/useAuth')
  useAuth().clearJwt()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * useAuth is tightly coupled to Nuxt runtime (useCookie, useState, computed).
 * Full integration tests require @nuxt/test-utils with Nuxt environment.
 * These tests validate the composable contract/shape.
 */
describe('useAuth contract', () => {
  it.each([
    [401, { statusCode: 401 }, 'unauthenticated', 1],
    [403, { response: { status: 403 } }, 'unauthenticated', 1],
    [429, { statusCode: 429 }, 'transient', 3],
    [500, { response: { status: 500 } }, 'transient', 3],
    [undefined, new TypeError('network failed'), 'transient', 3],
  ] as const)('토큰 실패 %s: 예상된 미인증은 무음이고 예상 밖 실패는 기록한다', async (code, error, status, attempts) => {
    const { useAuth } = await import('~/composables/useAuth')
    const fetch = vi.fn().mockRejectedValue(error)
    vi.stubGlobal('$fetch', fetch)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    const pending = useAuth().refreshJwt()
    await vi.advanceTimersByTimeAsync(1_200)
    await expect(pending).resolves.toEqual({ status })
    expect(fetch).toHaveBeenCalledTimes(attempts)
    expect(warn).not.toHaveBeenCalled()
    if (status === 'unauthenticated') expect(log).not.toHaveBeenCalled()
    else {
      expect(log).toHaveBeenCalledTimes(attempts)
      expect(log).toHaveBeenCalledWith('[auth] token request failed', code, error)
    }
  })

  it('exports expected interface shape', async () => {
    // Verify module exports exist (not runtime behavior)
    const mod = await import('~/composables/useAuth')
    expect(mod).toHaveProperty('useAuth')
    expect(typeof mod.useAuth).toBe('function')
  })

  it('JWT 요청 데드라인은 요청별로 취소하고 세션을 만료시키지 않는다', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()
    const signals: AbortSignal[] = []
    const fetch = vi.fn((_path, opts) => {
      signals.push(opts.signal)
      return new Promise<unknown>(() => {})
    })
    vi.stubGlobal('$fetch', fetch)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    const pending = auth.refreshJwt()
    await vi.advanceTimersByTimeAsync(46_200)
    await expect(pending).resolves.toEqual({ status: 'transient' })
    expect(log).toHaveBeenCalledTimes(3)
    expect(log).toHaveBeenCalledWith('[auth] token request failed', undefined, expect.any(Error))
    expect(signals).toHaveLength(3)
    expect(signals.every(signal => signal.aborted)).toBe(true)
    expect(new Set(signals).size).toBe(3)
    fetch.mockImplementationOnce((_path, opts) => {
      signals.push(opts.signal)
      return Promise.resolve({ token: 'new-token' })
    })
    await expect(auth.refreshJwt()).resolves.toEqual({ status: 'ok', token: 'new-token' })
    expect(signals[3]?.aborted).toBe(false)
  })
})
