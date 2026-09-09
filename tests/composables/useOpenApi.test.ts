// @vitest-environment nuxt
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'
import openapiPlugin from '~/plugins/openapi'

// Nuxt의 1시간 빌드 갱신 폴링을 격리해 요청 데드라인 타이머만 검증한다.
vi.mock('../../node_modules/nuxt/dist/app/plugins/check-outdated-build.client.js', () => ({ default: () => {} }))

mockNuxtImport('useAuth', () => () => ({
  isLoggedIn: { value: true },
  getJwt: () => 'cached', loadJwt: async () => 'cached',
  refreshJwt: async () => ({ status: 'ok', token: 'refreshed' }),
}))

async function createApiClient() {
  // Nuxt 테스트의 Node/DOM 혼합 전역 대신 Request와 동일한 Headers 구현을 쓴다.
  vi.stubGlobal('Headers', new Request('https://api.example.test').headers.constructor)
  useRuntimeConfig().public.apiBaseUrl = 'https://api.example.test/api/v1'
  const result = await openapiPlugin({ $i18n: { t: (key: string) => key } } as never)
  return result!.provide!.apiClient
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

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

  it('요청별 15초 데드라인은 취소와 오류 전파 후 다음 요청을 허용한다', async () => {
    const client = await createApiClient()
    const signals: AbortSignal[] = []
    const fetch = vi.fn((_request, opts) => {
      signals.push(opts.signal)
      return new Promise<Response>(() => {})
    })
    vi.stubGlobal('fetch', fetch)
    vi.useFakeTimers()
    const assertion = expect(client.get({ url: '/records' })).rejects.toThrow('common.loadFailDesc')
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
    expect(signals[0]?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    fetch.mockImplementationOnce((_request, opts) => {
      signals.push(opts.signal)
      return Promise.resolve(Response.json({ ok: true }))
    })
    expect((await client.get({ url: '/records' })).data).toEqual({ ok: true })
    expect(signals[1]?.aborted).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('사진 업로드 경로는 15초를 넘겨도 취소하지 않는다', async () => {
    const client = await createApiClient()
    let request!: Request
    let resolve!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn((input: Request) => {
      request = input
      return new Promise<Response>((yes) => { resolve = yes })
    }))
    vi.useFakeTimers()
    const pending = client.post({ url: '/uploads/photo', body: 'photo' })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(request.signal.aborted).toBe(false)
    resolve(Response.json({ url: '/photo.jpg' }))
    expect((await pending).data).toEqual({ url: '/photo.jpg' })
  })

  it('헤더 수신 뒤 본문이 멈춰도 데드라인이 요청을 취소한다', async () => {
    const client = await createApiClient()
    let signal!: AbortSignal
    vi.stubGlobal('fetch', vi.fn((_request, opts) => {
      signal = opts.signal
      return Promise.resolve({ clone: () => ({ arrayBuffer: () => new Promise(() => {}) }) })
    }))
    vi.useFakeTimers()
    const assertion = expect(client.get({ url: '/records' })).rejects.toThrow('common.loadFailDesc')
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
    expect(signal.aborted).toBe(true)
  })

  it('POST 401 재시도는 원래 본문과 새 JWT를 보존하고 별도 데드라인을 쓴다', async () => {
    const client = await createApiClient()
    const bodies: string[] = []
    const requests: Request[] = []
    const signals: AbortSignal[] = []
    vi.stubGlobal('fetch', vi.fn(async (request: Request, opts) => {
      requests.push(request)
      signals.push(opts.signal)
      bodies.push(await request.text())
      return bodies.length === 1 ? new Response('{}', { status: 401 }) : Response.json({ saved: true })
    }))
    const result = await client.post({ url: '/records', body: { note: 'hello' } })
    expect(result.data).toEqual({ saved: true })
    expect(bodies).toEqual(['{"note":"hello"}', '{"note":"hello"}'])
    expect(requests[1]?.headers.get('Authorization')).toBe('Bearer refreshed')
    expect(requests[1]?.headers.get('x-tw-retried')).toBe('1')
    expect(signals[0]).not.toBe(signals[1])
    expect(signals.every(signal => !signal.aborted)).toBe(true)
  })

  it('호출자의 취소 signal도 실제 fetch에 전달한다', async () => {
    const client = await createApiClient()
    let signal!: AbortSignal
    vi.stubGlobal('fetch', vi.fn((_request, opts) => {
      signal = opts.signal
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('caller aborted')), { once: true })
      })
    }))
    vi.useFakeTimers()
    const controller = new AbortController()
    const assertion = expect(client.get({ url: '/records', signal: controller.signal })).rejects.toThrow('caller aborted')
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await assertion
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['throw', 'reject'] as const)('fetch %s 실패에도 데드라인과 호출자 취소 리스너를 정리한다', async (settlement) => {
    const client = await createApiClient()
    const request = new Request('https://api.example.test/api/v1/records')
    const remove = vi.spyOn(request.signal, 'removeEventListener')
    vi.stubGlobal('fetch', vi.fn(() => {
      if (settlement === 'throw') throw new Error('fetch failed')
      return Promise.reject(new Error('fetch failed'))
    }))
    vi.useFakeTimers()
    await expect(client.getConfig().fetch!(request)).rejects.toThrow('fetch failed')
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })
})
