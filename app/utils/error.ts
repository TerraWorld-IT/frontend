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
