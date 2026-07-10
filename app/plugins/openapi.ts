import { createClient, createConfig } from '@hey-api/client-fetch'

/**
 * TerraWorld OpenAPI 클라이언트 플러그인.
 *
 * 런타임 API base URL 로 설정된 `@hey-api/client-fetch` 인스턴스를 하나 만들고
 * `useNuxtApp().$apiClient` 로 노출한다.
 *
 * JWT 흐름 (better-auth 도입 + 보안 리뷰 이후):
 *   - SEC-006: JWT 는 클라이언트에만 존재한다 (`useAuth` 안의 모듈 스코프 변수).
 *     Nitro 의 SSR 요청은 bearer 를 붙이지 않는다. Nitro 에는 브라우저측 토큰 캐시가 없고,
 *     사용자 쿠키를 self-fetch 로 넘기면 SSR payload 오염 위험이 있기 때문이다.
 *     SSR 시점에 데이터가 필요한 보호 라우트는 세션 쿠키가 `/api/*` Nitro 핸들러로
 *     전달되는 것에 의존한다 — Spring 은 브라우저에서만 접근 가능하다.
 *   - 요청 인터셉터(클라이언트 전용): `useAuth().getJwt()` 로 캐시된 JWT 를 꺼낸다.
 *     없으면 `loadJwt()` 를 돌린다. in-flight dedup 은 `useAuth` 가 소유하므로 이 경로와
 *     401 재시도 경로가 그것을 공유하고, 병렬 호출도 `/api/auth/token` 을 한 번만 친다.
 *   - SEC-024: 요청 본문은 hey-api 가 스트림을 소비하기 **전에** Request 를 clone 해서
 *     보관한다. 원본 Request 를 키로 하는 WeakMap 에 담아 두어 응답 인터셉터가 재시도
 *     경로에서 본문을 그대로 재생할 수 있게 한다. 이게 없으면 뮤테이션 요청(POST/PUT/PATCH)이
 *     빈 본문으로 재시도된다 — `Request.body` 는 일회용 ReadableStream 이다.
 *   - SEC-007: 401 을 받으면 인터셉터가 JWT 를 한 번 재발급하고 원래 요청을
 *     `x-tw-retried: 1` 헤더와 함께 한 번만 재시도한다. 진입 시 그 플래그를 검사하므로
 *     재시도 루프는 불가능하다.
 *     `/auth/login` 으로 보내는 것은 `/api/auth/token` 자체가 401/403 을 답할 때
 *     (`status: 'unauthenticated'`), 즉 세션이 진짜로 무효일 때뿐이다. 일시적 실패
 *     (네트워크 / 429 / 5xx)는 401 을 호출부에 그대로 노출하고 7일 세션은 건드리지 않는다.
 *     이 둘을 뭉개던 탓에 콜드 부팅 시 한 번의 실패로 사용자가 로그아웃됐다.
 *   - SEC-022: JWT 에 값이 있을 때만 bearer 를 붙인다. 공개 엔드포인트
 *     (/share, /items, /categories)는 로그인 상태여도 토큰을 싣지 않아 우발적 노출을 줄인다.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // 주의: 5xx / 네트워크 오류 사용자 알림은 인터셉터에서 처리하지 않는다.
  // call-site 들이 이미 구체적인 메시지로 toast.error 를 띄우므로(예: '기록 저장 실패'),
  // 인터셉터가 generic 토스트를 추가하면 double/triple toast 가 된다(코드리뷰 2026-06-15).
  // 전역 fatal/네비게이션 오류는 error.vue(500-class 분기 + 재시도)가 담당.

  const apiClient = createClient(
    createConfig({
      baseUrl: config.public.apiBaseUrl as string,
      credentials: 'include',
    }),
  )

  /**
   * SEC-024: stash a fresh clone of every outgoing Request so the response
   * interceptor can build a retry without trying to re-read the original
   * body stream (which hey-api has already consumed by the time the
   * response interceptor runs). WeakMap so entries get GC'd with the
   * Request object once its response is fully handled.
   */
  const requestClones = new WeakMap<Request, Request>()

  async function ensureJwt(): Promise<string | null> {
    if (import.meta.server) return null
    const { getJwt, loadJwt } = useAuth()
    const cached = getJwt()
    if (cached) return cached
    // in-flight dedup 은 useAuth 안으로 옮겼다 — 401 인터셉터 경로도 같은 dedup 을 타야
    // 부팅 시 병렬 API 호출이 `/api/auth/token` 을 한 번만 치기 때문.
    return loadJwt()
  }

  // --- Request interceptor: attach JWT + cache a clone for possible retry ---
  apiClient.interceptors.request.use(async (request) => {
    if (import.meta.server) return request
    const token = await ensureJwt()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    // Cache a pristine clone before hey-api consumes the body.
    requestClones.set(request, request.clone())
    return request
  })

  // --- Response interceptor: single retry on 401, loop-guarded ---
  apiClient.interceptors.response.use(async (response, request) => {
    if (response.status !== 401 || !import.meta.client) {
      return response
    }
    if (request?.headers.get('x-tw-retried') === '1') {
      // Already retried once with a fresh JWT; let the caller handle it.
      return response
    }

    const { refreshJwt } = useAuth()
    const result = await refreshJwt()

    if (result.status === 'unauthenticated') {
      // 세션이 **진짜로** 무효할 때만 로그인으로 보낸다 (`/api/auth/token` 이 401/403).
      // 왜 로그인 화면으로 튕겼는지 설명이 없으면 사용자 입장에선 "갑자기 로그아웃됨"으로
      // 보이므로 안내 토스트를 함께 띄운다. 이 코드베이스의 확립된 관례(usePayment/useWilting)는
      // setup 컨텍스트 밖(인터셉터 콜백 등)에서도 안전하도록 useI18n() 대신 nuxtApp.$i18n 을 쓴다.
      // (clearJwt 는 refreshJwt 가 이미 수행 — 토큰·타이머·플래그 정리)
      const { $i18n } = useNuxtApp()
      useToast().info($i18n.t('common.sessionExpired'))
      await navigateTo('/auth/login')
      return response
    }

    if (result.status !== 'ok') {
      // transient (네트워크 오류 / 429 / 5xx). 세션은 살아 있다. 로그아웃하지 말고 401 을
      // 그대로 호출부에 넘긴다 — 호출부가 자기 문맥에 맞는 에러 메시지를 띄운다.
      // 부팅 순간의 일시적 실패 하나가 멀쩡한 7일 세션을 날리던 경로가 여기였다.
      return response
    }

    const refreshed = result.token
    if (!request) return response

    // SEC-024: retry from the cached clone so the body stream is still
    // pristine. Clone it again here so the WeakMap entry remains valid
    // if the response fires multiple times (defensive — hey-api does
    // not currently re-fire interceptors but better safe).
    const cached = requestClones.get(request)
    if (!cached) {
      // No clone available — caller will see the 401.
      return response
    }
    const retryBase = cached.clone()
    const retryHeaders = new Headers(retryBase.headers)
    retryHeaders.set('Authorization', `Bearer ${refreshed}`)
    retryHeaders.set('x-tw-retried', '1')

    try {
      const retried = await fetch(
        new Request(retryBase.url, {
          method: retryBase.method,
          headers: retryHeaders,
          body: retryBase.body,
          credentials: 'include',
          // Preserve duplex when streaming a body — required by spec.
          // @ts-expect-error - duplex not in current TS lib types
          duplex: retryBase.body ? 'half' : undefined,
        }),
      )
      return retried
    }
    catch (e) {
      // Dev visibility — stripped from prod by vite esbuild `drop`.
      // eslint-disable-next-line no-console
      console.error('[auth] 401 retry failed', e)
      return response
    }
  })

  return {
    provide: {
      apiClient,
    },
  }
})
