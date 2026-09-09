import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import RecordCompleteToast from '~/components/record/RecordCompleteToast.vue'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('기록 완료 토스트 읽기 시간', () => {
  it.each(['focus', 'hover'] as const)('%s 동안 정지하고 남은 3.5초가 지난 뒤 한 번만 닫힌다', async (interaction) => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: interaction === 'hover' } as MediaQueryList)
    wrapper = await mountSuspended(RecordCompleteToast, { props: { open: false, kind: 'dew', count: 1 } })
    vi.useFakeTimers()
    await wrapper.setProps({ open: true })
    const root = document.body.querySelector('[role="status"]') as HTMLElement
    const button = root.querySelector('button')!
    vi.advanceTimersByTime(1000)
    if (interaction === 'focus') button.focus()
    const matches = interaction === 'hover' ? vi.spyOn(root, 'matches').mockReturnValue(true) : null
    vi.advanceTimersByTime(10000)
    expect(wrapper.emitted('close')).toBeFalsy()
    button.blur()
    matches?.mockRestore()
    vi.advanceTimersByTime(2400)
    expect(wrapper.emitted('close')).toBeFalsy()
    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('close')).toHaveLength(1)
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('hover 불가 환경의 잔류 hover 는 3.5초 만료를 막지 않는다', async () => {
    const media = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    wrapper = await mountSuspended(RecordCompleteToast, { props: { open: false, kind: 'dew', count: 1 } })
    vi.useFakeTimers()
    await wrapper.setProps({ open: true })
    const root = document.body.querySelector('[role="status"]') as HTMLElement
    vi.spyOn(root, 'matches').mockReturnValue(true)
    vi.advanceTimersByTime(3400)
    expect(wrapper.emitted('close')).toBeFalsy()
    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(media).toHaveBeenCalledWith('(hover: hover)')
  })

  it('닫힌 뒤 재개방하면 표시 시간이 초기화되고 언마운트가 타이머를 해제한다', async () => {
    wrapper = await mountSuspended(RecordCompleteToast, { props: { open: false, kind: 'sun', count: 2 } })
    vi.useFakeTimers()
    await wrapper.setProps({ open: true })
    vi.advanceTimersByTime(3000)
    await wrapper.setProps({ open: false })
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('close')).toBeFalsy()
    await wrapper.setProps({ open: true })
    vi.advanceTimersByTime(3400)
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper = undefined
  })
})
