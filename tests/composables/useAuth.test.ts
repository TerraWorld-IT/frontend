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
  it.each(['login', 'signup', 'logout'] as const)('인증 %s 요청이 멈추면 15초 안에 취소하고 다시 요청할 수 있다', async (action) => {
    const { authClient } = await import('~/lib/auth-client')
    const signals: AbortSignal[] = []
    const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init!.signal!)
      return new Promise<Response>(() => {})
    })
    vi.stubGlobal('fetch', fetch)
    vi.useFakeTimers()
    const call = () => action === 'login'
      ? authClient.signIn.email({ email: 'test@example.com', password: 'password123' })
      : action === 'signup'
        ? authClient.signUp.email({ email: 'test@example.com', password: 'password123', name: '테스트' })
        : authClient.signOut()
    let settled = false
    const pending = call().then(() => { settled = true }, () => { settled = true })
    await vi.advanceTimersByTimeAsync(15_000)
    expect(settled).toBe(true)
    expect(signals).toHaveLength(1)
    expect(signals[0]?.aborted).toBe(true)
    await pending
    fetch.mockResolvedValueOnce(Response.json({}))
    await expect(call()).resolves.toBeDefined()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('응답 헤더 뒤 본문이 멈춰도 인증 요청을 취소한다', async () => {
    const { authClient } = await import('~/lib/auth-client')
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined
      return Promise.resolve(new Response(new ReadableStream(), { headers: { 'content-type': 'application/json' } }))
    }))
    vi.useFakeTimers()
    let settled = false
    const pending = authClient.signOut().then(() => { settled = true }, () => { settled = true })
    await vi.advanceTimersByTimeAsync(15_000)
    expect(settled).toBe(true)
    expect(signal?.aborted).toBe(true)
    await pending
  })

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
