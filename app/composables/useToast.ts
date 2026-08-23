export type ToastType = 'success' | 'error' | 'info'

/**
 * 토스트 스타일(아프젝 Figma 2종).
 * - card: 393×88 흰 카드 + 1px 외곽선 r8, 좌 아이콘 + 굵은 제목 + 회색 부제 (상단 중앙)
 * - pill: 351×51 흰 필 + 핑크 외곽선, 텍스트 1줄 (상단)
 */
export type ToastVariant = 'card' | 'pill'

export interface Toast {
  id: number
  type: ToastType
  /** 제목(card) 또는 본문 1줄(pill). 기존 `message` 필드명은 호환을 위해 유지한다. */
  message: string
  variant: ToastVariant
  description?: string
  /** 좌측 아이콘 — 이모지 문자열 또는 `lucide:*` 아이콘 이름 */
  icon?: string
  actionLabel?: string
  onAction?: () => void
}

export interface ToastOptions {
  title: string
  description?: string
  icon?: string
  /** 기본값: description 또는 icon 이 있으면 card, 없으면 pill */
  variant?: ToastVariant
  type?: ToastType
  /** 자동 닫힘(ms). 기본 3000 */
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

/** 기존 success/error/info(message) 호출에 덧붙일 수 있는 선택 옵션 */
export type ToastExtra = Omit<ToastOptions, 'title' | 'type'>

const DEFAULT_DURATION_MS = 3000

/**
 * 토스트 알림 composable.
 * module-scope ref 대신 useState(SSR-safe) 를 써서 요청 간 상태 오염을 막는다.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  const nextId = useState<number>('toastNextId', () => 0)

  function show(options: ToastOptions) {
    const type: ToastType = options.type ?? 'info'
    const variant: ToastVariant = options.variant
      ?? ((options.description || options.icon) ? 'card' : 'pill')
    const message = options.title
    const description = options.description

    // 같은 문구가 이미 떠 있으면 새로 쌓지 않는다. 여러 항목을 연속 저장할 때(예: 동의 토글)
    // 동일한 "저장되었어요" 토스트가 겹쳐 쌓이던 문제. 기존 토스트의 표시 시간은 그대로 둔다.
    if (toasts.value.some(t => t.message === message && t.type === type && t.description === description)) return

    const id = nextId.value++
    toasts.value.push({
      id,
      type,
      message,
      variant,
      description,
      icon: options.icon,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    })
    if (import.meta.client) {
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
      }, options.duration ?? DEFAULT_DURATION_MS)
    }
  }

  /** 사용자 스와이프 등 명시적 닫기. 타이머 만료 전에 목록에서 제거한다 (만료 타이머는 no-op 이 됨). */
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  // 기존 호출 시그니처(message 1개) 호환 — 두 번째 인자는 선택 확장(description/icon/variant 등).
  function success(message: string, extra?: ToastExtra) { show({ ...extra, title: message, type: 'success' }) }
  function error(message: string, extra?: ToastExtra) { show({ ...extra, title: message, type: 'error' }) }
  function info(message: string, extra?: ToastExtra) { show({ ...extra, title: message, type: 'info' }) }

  return { toasts: readonly(toasts), show, success, error, info, dismiss }
}
