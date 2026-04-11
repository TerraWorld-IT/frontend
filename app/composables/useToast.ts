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
