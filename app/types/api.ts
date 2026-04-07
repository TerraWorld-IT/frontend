/** 공통 API 응답 래퍼 */
export interface ApiResponse<T> {
  data: T
  message?: string
}

/** 페이지네이션 응답 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  size: number
  hasNext: boolean
}

/** API 에러 응답 */
export interface ApiError {
  status: number
  message: string
  code?: string
  errors?: Record<string, string[]>
}

/** 멱등성 요청용 */
export interface IdempotentRequest {
  idempotencyKey: string
}
