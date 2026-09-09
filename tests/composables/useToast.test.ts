// useToast — 아프젝 2종 토스트(card/pill) 확장 + 기존 success/error/info(message) 호환 계약.
// nuxt 환경(vitest.config.ts)이라 useState 기반 composable 을 테스트 안에서 직접 호출할 수 있다.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToast } from '~/composables/useToast'

function clearAll() {
  const { toasts, dismiss } = useToast()
  // dismiss 는 배열을 재할당하므로 기존 참조를 순회해도 안전하다
  for (const t of toasts.value) dismiss(t.id)
}

describe('useToast contract', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearAll()
    vi.useFakeTimers()
  })

  afterEach(() => {
    clearAll()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it.each(['success', 'error', 'info'] as const)('%s 는 기본 3초에서 포커스 정지 시간을 제외한다', (type) => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    const toast = useToast()
    toast[type]('읽는 중')
    const root = document.createElement('div')
    root.dataset.toastId = String(toast.toasts.value[0]!.id)
    const button = document.createElement('button')
    root.append(button); document.body.append(root)
    vi.advanceTimersByTime(1000)
    button.focus()
    vi.advanceTimersByTime(10000)
    expect(toast.toasts.value).toHaveLength(1)
    button.blur()
    vi.advanceTimersByTime(1900)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(100)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('card hover 와 대기열은 지정한 표시 시간을 소모하지 않는다', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    const toast = useToast()
    toast.show({ title: '카드', description: '본문', duration: 1000 })
    toast.info('대기', { duration: 2000 })
    const root = document.createElement('div')
    root.dataset.toastId = String(toast.toasts.value[0]!.id)
    document.body.append(root)
    const query = vi.spyOn(document, 'querySelector').mockReturnValue(root)
    vi.advanceTimersByTime(10000)
    expect(toast.toasts.value).toHaveLength(2)
    query.mockRestore()
    vi.advanceTimersByTime(1000)
    expect(toast.toasts.value.map(t => t.message)).toEqual(['대기'])
    vi.advanceTimersByTime(1800)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('hover 불가 환경의 잔류 hover 는 기본 3초 만료를 막지 않는다', () => {
    const media = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    const toast = useToast()
    toast.info('터치 안내')
    const root = document.createElement('div')
    root.dataset.toastId = String(toast.toasts.value[0]!.id)
    document.body.append(root)
    vi.spyOn(document, 'querySelector').mockReturnValue(root)
    vi.advanceTimersByTime(2900)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(100)
    expect(toast.toasts.value).toHaveLength(0)
    expect(media).toHaveBeenCalledWith('(hover: hover)')
  })

  it('matchMedia 가 없어도 포커스 정지 후 예외 없이 3초에 만료한다', () => {
    vi.stubGlobal('matchMedia', undefined)
    const toast = useToast()
    toast.info('미지원 환경 안내')
    const root = document.createElement('div')
    root.dataset.toastId = String(toast.toasts.value[0]!.id)
    const button = document.createElement('button')
    root.append(button); document.body.append(root)
    vi.spyOn(document, 'querySelector').mockReturnValue(root)
    button.focus()
    expect(() => vi.advanceTimersByTime(10000)).not.toThrow()
    expect(toast.toasts.value).toHaveLength(1)
    button.blur()
    vi.advanceTimersByTime(2900)
    expect(toast.toasts.value).toHaveLength(1)
    expect(() => vi.advanceTimersByTime(100)).not.toThrow()
    expect(toast.toasts.value).toHaveLength(0)
  })

  afterEach(() => {
    try {
      // DOM 환경 해제 전에 토스트를 닫고 interval의 자체 정리를 실행한다.
      clearAll()
      vi.runOnlyPendingTimers()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('exports useToast function', async () => {
    const mod = await import('~/composables/useToast')
    expect(mod).toHaveProperty('useToast')
    expect(typeof mod.useToast).toBe('function')
  })

  it('기존 시그니처 success/error/info(message) 는 그대로 동작한다 (pill 기본)', () => {
    const toast = useToast()
    toast.success('저장되었어요')
    toast.error('실패했어요')
    toast.info('안내')
    expect(toast.toasts.value.map(t => [t.type, t.message, t.variant])).toEqual([
      ['success', '저장되었어요', 'pill'],
      ['error', '실패했어요', 'pill'],
      ['info', '안내', 'pill'],
    ])
  })

  it('show({title, description, icon}) 은 card 로 쌓인다', () => {
    const toast = useToast()
    toast.show({ title: '이미지 저장 완료', description: '나의 테라 이미지가 사진첩에 저장되었어요', icon: '🖼️' })
    const t = toast.toasts.value[0]!
    expect(t.variant).toBe('card')
    expect(t.type).toBe('info')
    expect(t.message).toBe('이미지 저장 완료')
    expect(t.description).toBe('나의 테라 이미지가 사진첩에 저장되었어요')
    expect(t.icon).toBe('🖼️')
  })

  it('variant 를 명시하면 description 이 있어도 pill 로 쌓인다', () => {
    const toast = useToast()
    toast.show({ title: '친구A 에게 연장 요청 성공!', description: '부제', variant: 'pill' })
    expect(toast.toasts.value[0]!.variant).toBe('pill')
  })

  it('success(message, extra) 두 번째 인자로 card 확장이 가능하다', () => {
    const toast = useToast()
    toast.success('이미지 저장 완료', { description: '사진첩에 저장되었어요', icon: '🖼️' })
    const t = toast.toasts.value[0]!
    expect(t.type).toBe('success')
    expect(t.variant).toBe('card')
    expect(t.description).toBe('사진첩에 저장되었어요')
  })

  it('actionLabel/onAction 이 보존된다', () => {
    const toast = useToast()
    let called = 0
    toast.show({ title: '제목', actionLabel: '보기', onAction: () => { called++ } })
    const t = toast.toasts.value[0]!
    expect(t.actionLabel).toBe('보기')
    t.onAction?.()
    expect(called).toBe(1)
  })

  it('같은 type+title+description 은 중복으로 쌓이지 않는다', () => {
    const toast = useToast()
    toast.success('저장되었어요')
    toast.success('저장되었어요')
    toast.success('저장되었어요', { description: '다른 부제' })
    expect(toast.toasts.value.length).toBe(2)
  })

  it('dismiss(id) 로 즉시 제거된다', () => {
    const toast = useToast()
    toast.info('A')
    toast.info('B')
    const first = toast.toasts.value[0]!
    toast.dismiss(first.id)
    expect(toast.toasts.value.map(t => t.message)).toEqual(['B'])
  })
})
