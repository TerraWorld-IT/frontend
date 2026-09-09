import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { STORAGE_KEYS } from '~/utils/constants'
import { readDraft } from '~/utils/draftStorage'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'

vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'habit-user' } }) }))

const wrappers: VueWrapper[] = []

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('HabitCreateSheet', () => {
  it('이탈할 때만 이름을 저장하고 재오픈 복원 및 생성 성공 삭제를 지원한다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_HABIT_TITLE}habit-user`
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, friends: [] },
      global: { stubs: { CommonBottomSheet: { props: ['open'], template: '<section v-if="open"><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text().includes('나의 습관'))!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('매일 독서')
    expect(localStorage.getItem(key)).toBeNull()
    await wrapper.setProps({ open: false })
    expect(readDraft(key)).toBe('매일 독서')
    await wrapper.setProps({ open: true })
    await wrapper.findAll('button').find(button => button.text().includes('나의 습관'))!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    expect(wrapper.get('input').element.value).toBe('매일 독서')
    wrapper.vm.clear()
    await wrapper.setProps({ open: false })
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('A-02 선택한 친구를 DOM 맨 앞으로 옮기고 해제하면 원래 순서를 복원한다', async () => {
    const friends = [
      { userId: 'friend-a', nickname: '친구 A' },
      { userId: 'friend-b', nickname: '친구 B' },
      { userId: 'friend-c', nickname: '친구 C' },
    ]
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, friends },
      global: { stubs: {
        CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' },
      } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text().includes('친구와'))!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('함께 독서')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    const cards = wrapper.findAll('p').filter(item => item.text().startsWith('친구 '))
    expect(cards.map(card => card.text())).toEqual(['친구 A', '친구 B', '친구 C'])
    await wrapper.findAll('button').filter(button => button.text() === '요청하기')[2]!.trigger('click')
    expect(wrapper.findAll('p').filter(item => item.text().startsWith('친구 ')).map(card => card.text()))
      .toEqual(['친구 C', '친구 A', '친구 B'])
    const requests = wrapper.findAll('button').filter(button => ['요청하기', '선택됨'].includes(button.text()))
    expect(requests[0]!.text()).toBe('선택됨')
    expect(requests[0]!.attributes('disabled')).toBeUndefined()
    expect(friends.map(friend => friend.userId)).toEqual(['friend-a', 'friend-b', 'friend-c'])
    expect(requests.every(button => button.attributes('disabled') === undefined)).toBe(true)
    await requests[2]!.trigger('click')
    expect(wrapper.findAll('p').filter(item => item.text().startsWith('친구 ')).map(card => card.text()))
      .toEqual(['친구 B', '친구 A', '친구 C'])
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.findAll('button').find(button => button.text() === '이전')!.trigger('click')
    expect(wrapper.get('input').element.value).toBe('함께 독서')
    await wrapper.findAll('button').find(button => button.text() === '이전')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    expect(wrapper.get('input').element.value).toBe('함께 독서')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '선택됨')!.trigger('click')
    expect(wrapper.findAll('p').filter(item => item.text().startsWith('친구 ')).map(card => card.text()))
      .toEqual(['친구 A', '친구 B', '친구 C'])
  })
})
