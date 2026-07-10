export interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

/**
 * Toast notification composable.
 * Uses useState (SSR-safe) instead of module-scope ref to prevent cross-request state pollution.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  const nextId = useState<number>('toastNextId', () => 0)

  function show(message: string, type: Toast['type'] = 'info', duration = 3000) {
    // 같은 문구가 이미 떠 있으면 새로 쌓지 않는다. 여러 항목을 연속 저장할 때(예: 동의 토글)
    // 동일한 "저장되었어요" 토스트가 겹쳐 쌓이던 문제. 기존 토스트의 표시 시간은 그대로 둔다.
    if (toasts.value.some(t => t.message === message && t.type === type)) return

    const id = nextId.value++
    toasts.value.push({ id, type, message })
    if (import.meta.client) {
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
      }, duration)
    }
  }

  function success(message: string) { show(message, 'success') }
  function error(message: string) { show(message, 'error') }
  function info(message: string) { show(message, 'info') }

  return { toasts: readonly(toasts), success, error, info }
}
