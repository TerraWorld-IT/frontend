import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import ConfirmDialog from '~/components/record/ConfirmDialog.vue'
import BottomSheet from '~/components/common/BottomSheet.vue'
import ManagePanel from '~/components/terrarium/ManagePanel.vue'
import { useBackButtonStack } from '~/composables/useBackButtonStack'

const { dismissKeyboard } = vi.hoisted(() => ({ dismissKeyboard: vi.fn() }))
mockNuxtImport('dismissKeyboard', () => dismissKeyboard)
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn())
  dismissKeyboard.mockClear()
})

describe('공용 다이얼로그 실제 닫힘', () => {
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
