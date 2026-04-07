import type { ApiResponse, PaginatedResponse } from '~/types/api'

/**
 * API 클라이언트 composable
 * - JWT Bearer 토큰 자동 첨부
 * - 401 시 로그아웃 (추후 refresh 연동)
 * - 타입 안전 제네릭 래퍼
 */
export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl as string

  const apiFetch = $fetch.create({
    baseURL,
    onRequest({ options }) {
      // 인증 시스템 확정 후 토큰 로직 추가
      // const token = useLocalStorage('access_token', '')
      // if (token.value) {
      //   options.headers = { ...options.headers, Authorization: `Bearer ${token.value}` }
      // }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        navigateTo('/auth/login')
      }
    },
  })

  /** GET 요청 */
  async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return apiFetch<T>(url, { method: 'GET', params })
  }

  /** GET 페이지네이션 */
  async function getPage<T>(url: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> {
    return apiFetch<PaginatedResponse<T>>(url, { method: 'GET', params })
  }

  /** POST 요청 */
  async function post<T>(url: string, body?: unknown): Promise<T> {
    return apiFetch<T>(url, { method: 'POST', body })
  }

  /** PUT 요청 */
  async function put<T>(url: string, body?: unknown): Promise<T> {
    return apiFetch<T>(url, { method: 'PUT', body })
  }

  /** DELETE 요청 */
  async function del<T = void>(url: string): Promise<T> {
    return apiFetch<T>(url, { method: 'DELETE' })
  }

  return { apiFetch, get, getPage, post, put, del }
}
