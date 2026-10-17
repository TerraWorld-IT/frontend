import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { computed, ref } from 'vue'
import ReminderSettings from '~/components/profile/ReminderSettings.vue'

const mocks = vi.hoisted(() => ({ supported: true, update: vi.fn() }))
mockNuxtImport('useDailyReminder', () => (id: () => string | null) => ({
  supported: computed(() => mocks.supported && !!id()),
  state: ref({ enabled: false, time: '21:00' }), busy: ref(false), update: mocks.update,
}))

let wrapper: VueWrapper | undefined
beforeEach(() => { mocks.supported = true; mocks.update.mockReset().mockResolvedValue(false) })
afterEach(() => wrapper?.unmount())

describe('설정 알림 카드', () => {
  it('지원 환경에서 별도 토글과 네이티브 시각 입력을 제공한다', async () => {
    wrapper = await mountSuspended(ReminderSettings, { props: { userId: 'user-a' } })
    expect(wrapper.find('[data-testid="daily-reminder-settings"]').exists()).toBe(true)
    expect(wrapper.get('input[type="time"]').attributes('value')).toBe('21:00')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledWith(true)
    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
  })

  it.each(['unsupported', 'signed-out'])('%s일 때 카드를 숨긴다', async (reason) => {
    mocks.supported = reason !== 'unsupported'
    wrapper = await mountSuspended(ReminderSettings, { props: { userId: reason === 'signed-out' ? null : 'user-a' } })
    expect(wrapper.find('[data-testid="daily-reminder-settings"]').exists()).toBe(false)
  })

  it('시각 변경 실패 후 저장된 시각으로 되돌린다', async () => {
    wrapper = await mountSuspended(ReminderSettings, { props: { userId: 'user-a' } })
    await wrapper.get('input[type="time"]').setValue('08:30')
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledWith(false, '08:30')
    expect((wrapper.get('input[type="time"]').element as HTMLInputElement).value).toBe('21:00')
  })
})
