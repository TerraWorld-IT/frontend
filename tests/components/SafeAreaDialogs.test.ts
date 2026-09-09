import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import ConfirmDialog from '~/components/record/ConfirmDialog.vue'
import BottomSheet from '~/components/common/BottomSheet.vue'
import Modal from '~/components/common/Modal.vue'
import ManagePanel from '~/components/terrarium/ManagePanel.vue'
import { useBackButtonStack } from '~/composables/useBackButtonStack'

const { dismissKeyboard } = vi.hoisted(() => ({ dismissKeyboard: vi.fn(async () => {
  const active = document.activeElement
  if (active instanceof HTMLElement) active.blur()
}) }))
mockNuxtImport('dismissKeyboard', () => dismissKeyboard)
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn())
  dismissKeyboard.mockClear()
})

describe('공용 다이얼로그 실제 닫힘', () => {
  it.each(['sheet', 'modal'] as const)('%s 닫힘 watch는 입력 blur 후 트리거로 포커스를 복귀한다', async (kind) => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    cleanups.push(() => trigger.remove())
    trigger.focus()
    const wrapper = kind === 'sheet'
      ? await mountSuspended(BottomSheet, { props: { open: false, ariaLabel: '편집' }, slots: { default: '<input data-focus-test>' } })
      : await mountSuspended(Modal, { props: { modelValue: false }, slots: { default: '<input data-focus-test>' } })
    cleanups.push(() => wrapper.unmount())
    await wrapper.setProps(kind === 'sheet' ? { open: true } : { modelValue: true })
    await nextTick()
    const input = document.querySelector<HTMLInputElement>('[data-focus-test]')!
    input.focus()
    const order: string[] = []
    input.addEventListener('blur', () => order.push('입력 blur'))
    trigger.addEventListener('focus', () => order.push('트리거 focus'))
    await wrapper.setProps(kind === 'sheet' ? { open: false } : { modelValue: false })
    expect(dismissKeyboard).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['입력 blur', '트리거 focus'])
    expect(document.activeElement).toBe(trigger)
  })

  it.each(['sheet', 'modal'] as const)('%s 열린 채 언마운트해도 blur 다음 트리거 포커스가 유지된다', async (kind) => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    cleanups.push(() => trigger.remove())
    trigger.focus()
    const wrapper = kind === 'sheet'
      ? await mountSuspended(BottomSheet, { props: { open: true, ariaLabel: '편집' }, slots: { default: '<input data-focus-test>' } })
      : await mountSuspended(Modal, { props: { modelValue: true }, slots: { default: '<input data-focus-test>' } })
    await nextTick()
    document.querySelector<HTMLInputElement>('[data-focus-test]')!.focus()
    wrapper.unmount()
    expect(dismissKeyboard).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(trigger)
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
  })

  it('관리 탭 속성을 Teleport 내부 실제 패널로 전달한다', async () => {
    const wrapper = await mountSuspended(ManagePanel, {
      props: { open: true, tab: 'items', tiles: [], busy: false, saving: false, maxSlots: 10, placedCount: 0 },
      attrs: { id: 'home-manage-panel', role: 'tabpanel', 'aria-labelledby': 'home-manage-tab-items' },
    })
    cleanups.push(() => wrapper.unmount())
    const panel = document.getElementById('home-manage-panel')
    expect(panel?.tagName).toBe('SECTION')
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(panel?.getAttribute('aria-labelledby')).toBe('home-manage-tab-items')
  })

  it('initial ConfirmDialog는 back을 cancel로 요청하고 부모가 닫아야 해제한다', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, { props: { open: true, title: '확인', message: '취소할까요?', confirmText: '확인' } })
    cleanups.push(() => wrapper.unmount())
    const { popTopBackHandler } = useBackButtonStack()
    popTopBackHandler()
    popTopBackHandler()
    expect(wrapper.emitted('close')).toHaveLength(2)
    expect(wrapper.emitted('confirm')).toBeUndefined()
    await wrapper.setProps({ open: false })
    expect(popTopBackHandler()).toBe(false)
  })

  it('BottomSheet 닫기 요청 거부 때는 키보드를 유지하고 실제 false 전환에서만 닫는다', async () => {
    const wrapper = await mountSuspended(BottomSheet, { props: { open: true, ariaLabel: '편집' } })
    cleanups.push(() => wrapper.unmount())
    document.querySelector<HTMLButtonElement>('[aria-label="닫기"]')!.click()
    await nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(dismissKeyboard).not.toHaveBeenCalled()
    await wrapper.setProps({ open: false })
    expect(dismissKeyboard).toHaveBeenCalledTimes(1)
  })

  it('열린 시트를 unmount할 때 키보드와 back 등록을 정리한다', async () => {
    const wrapper = await mountSuspended(BottomSheet, { props: { open: true, ariaLabel: '편집' } })
    wrapper.unmount()
    expect(dismissKeyboard).toHaveBeenCalledTimes(1)
    expect(useBackButtonStack().popTopBackHandler()).toBe(false)
  })
})
