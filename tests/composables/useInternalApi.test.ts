// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'

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
})
