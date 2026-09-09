// @vitest-environment nuxt
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useAuth', () => () => ({ isLoggedIn: { value: true }, getJwt: () => 'cached', loadJwt: async () => 'refreshed' }))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/**
 * useInternalApi 는 OpenAPI spec 밖의 @Hidden backend endpoint(admin/friend/free-placement)
 * 호출용 authed $fetch 래퍼다. JWT 부착 + 401 시 토큰 refresh 후 1회 재시도가 본체.
 *
 * 실제 네트워크 동작(baseURL origin 결합, 401 재시도)은 $fetch + useAuth + useRuntimeConfig
 * auto-import 에 의존하므로 통합/실 백엔드 e2e 영역으로 위임한다. 본 단위 테스트는
 * 모듈 export contract + factory 가 반환하는 surface(request 함수) shape 을 보장한다
 * (얇은 래퍼이므로 contract 테스트 중심 — useToast/useAuth contract 테스트와 동일 패턴).
 */
describe('useInternalApi', () => {
  it('exports useInternalApi factory', async () => {
    const mod = await import('~/composables/useInternalApi')
    expect(mod).toHaveProperty('useInternalApi')
    expect(typeof mod.useInternalApi).toBe('function')
  })

  it('factory 는 request 함수를 노출한다', async () => {
    const { useInternalApi } = await import('~/composables/useInternalApi')
    const api = useInternalApi()
    expect('request' in api).toBe(true)
    expect(typeof api.request).toBe('function')
  })

  it('request 는 Promise 를 반환하는 호출 가능 함수다', async () => {
    const { useInternalApi } = await import('~/composables/useInternalApi')
    const { request } = useInternalApi()
    // request 의 시그니처: (path, opts?) => Promise<T>
    expect(request.length).toBeGreaterThanOrEqual(1)
  })

  it('15초 초과 요청을 취소하고 오류를 전파하며 다음 요청은 정상 처리한다', async () => {
    const { useInternalApi } = await import('~/composables/useInternalApi')
    const signals: AbortSignal[] = []
    const fetch = vi.fn((_path, opts) => {
      signals.push(opts.signal)
      return new Promise(() => {})
    })
    vi.stubGlobal('$fetch', fetch)
    vi.useFakeTimers()
    const { request } = useInternalApi()
    const assertion = expect(request('/api/v1/example')).rejects.toThrow('요청 처리 중 오류가 발생했습니다')
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
    expect(signals[0]?.aborted).toBe(true)
    fetch.mockImplementationOnce((_path, opts) => {
      signals.push(opts.signal)
      return Promise.resolve({ ok: true })
    })
    await expect(request('/api/v1/example')).resolves.toEqual({ ok: true })
    expect(signals[1]?.aborted).toBe(false)
    expect(signals[0]).not.toBe(signals[1])
  })

  it('IAP의 60초 옵션은 15초에 취소하지 않고 자체 데드라인에서 취소한다', async () => {
    const { useInternalApi } = await import('~/composables/useInternalApi')
    let signal!: AbortSignal
    vi.stubGlobal('$fetch', vi.fn((_path, opts) => {
      signal = opts.signal
      return new Promise(() => {})
    }))
    vi.useFakeTimers()
    const assertion = expect(useInternalApi().request('/api/v1/billing/iap/verify', { method: 'POST', deadlineMs: 60_000 }))
      .rejects.toThrow('요청 처리 중 오류가 발생했습니다')
    await vi.advanceTimersByTimeAsync(15_000)
    expect(signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(45_000)
    await assertion
    expect(signal.aborted).toBe(true)
  })
})
