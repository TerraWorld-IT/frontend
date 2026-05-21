/**
 * N5 / P-FRIEND (구현 계획서 v4, 2026-05-21): OpenAPI spec 외 `@Hidden` backend
 * endpoint 호출용 authed fetch.
 *
 * admin (`/api/v1/admin/*`) · friend (`/api/v1/social/friends/*`) · 자유배치
 * (`/api/v1/terrarium/free-placement/*`) 등은 generated SDK 에 없으므로 raw `$fetch` 로
 * 호출. JWT 부착 + 401 시 토큰 refresh 후 1회 재시도.
 *
 * baseURL 주의 (code-review CDX-002): `config.public.apiBaseUrl` 은 이미 `/api/v1` 를
 * 포함 (예: `http://localhost:8080/api/v1`). 호출 path 도 `/api/v1/...` 이므로 그대로
 * 결합하면 `/api/v1/api/v1/...` 이중 경로 → 404. origin (`/api/v1` 제거) 을 baseURL 로 사용.
 *
 * 사용:
 *   const { request } = useInternalApi()
 *   const dash = await request<AdminDashboard>('/api/v1/admin/dashboard')
 *   await request('/api/v1/admin/levels/3', { method: 'PUT', body: {...} })
 */
export function useInternalApi() {
  const config = useRuntimeConfig()
  const { getJwt, loadJwt } = useAuth()

  // CDX-002: apiBaseUrl 끝의 `/api/v1` 제거 → origin. path 가 `/api/v1/...` 풀경로.
  const origin = (config.public.apiBaseUrl as string).replace(/\/api\/v1\/?$/, '')

  function isUnauthorized(e: unknown): boolean {
    const err = e as { statusCode?: number, response?: { status?: number } }
    return err?.statusCode === 401 || err?.response?.status === 401
  }

  async function request<T>(
    path: string,
    opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: unknown } = {},
  ): Promise<T> {
    const doFetch = (token: string | null) =>
      $fetch<T>(path, {
        baseURL: origin,
        method: opts.method ?? 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: opts.body as Record<string, unknown> | undefined,
      })

    const cached = getJwt()
    try {
      return await doFetch(cached ?? (await loadJwt()))
    } catch (e) {
      // CDX-003: 401 시 토큰 만료 가능 — refresh 후 1회 재시도 (openapi plugin 과 동일 정책)
      if (isUnauthorized(e)) {
        return await doFetch(await loadJwt())
      }
      throw e
    }
  }

  return { request }
}
