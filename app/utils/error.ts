/**
 * Extract a human-readable message from an unknown error.
 * Used across all SDK call sites for consistent error handling.
 */
export function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  if (typeof e === 'string') return e
  return fallback
}

/**
 * SDK `{error}` 에서 서버 에러 코드(`_Error.code`, 예: HABIT_LIMIT_EXCEEDED)를 안전하게 꺼낸다.
 * SDK 의 error 타입은 loose 하지만 런타임 본문은 `_Error{code,message}` 다. 코드가 없으면 null.
 */
export function errCode(e: unknown): string | null {
  if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
    return (e as { code: string }).code
  }
  return null
}
