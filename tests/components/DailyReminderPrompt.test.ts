import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { computed, ref } from 'vue'
import DailyReminderPrompt from '~/components/record/DailyReminderPrompt.vue'
import Modal from '~/components/common/Modal.vue'

const mocks = vi.hoisted(() => ({ supported: true, update: vi.fn() }))
mockNuxtImport('useDailyReminder', () => () => ({ supported: computed(() => mocks.supported), busy: ref(false), update: mocks.update }))
let wrapper: VueWrapper | undefined
beforeEach(() => { mocks.supported = true; mocks.update.mockReset().mockResolvedValue(true) })
afterEach(() => wrapper?.unmount())

describe('기록 알림 제안', () => {
  it('공통 모달로 기본 21시 알림 켜기를 요청한다', async () => {
    wrapper = await mountSuspended(DailyReminderPrompt, { props: { modelValue: true, userId: 'user-a' }, shallow: true })
    const modal = wrapper.findComponent(Modal)
    expect(modal.props('confirmText')).toBe('알림 받기')
    modal.vm.$emit('confirm')
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledWith(true, '21:00')
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
  })

  it('미지원 환경에서는 모달을 열지 않는다', async () => {
    mocks.supported = false
    wrapper = await mountSuspended(DailyReminderPrompt, { props: { modelValue: true, userId: 'user-a' }, shallow: true })
    expect(wrapper.findComponent(Modal).props('modelValue')).toBe(false)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('취소는 권한을 요청하지 않고 닫는다', async () => {
    wrapper = await mountSuspended(DailyReminderPrompt, { props: { modelValue: true, userId: 'user-a' }, shallow: true })
    wrapper.findComponent(Modal).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
