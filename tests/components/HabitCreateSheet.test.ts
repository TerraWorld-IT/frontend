import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'

const wrappers: VueWrapper[] = []

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('HabitCreateSheet', () => {
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
    const requests = wrapper.findAll('button').filter(button => ['요청하기', '요청 대기 중'].includes(button.text()))
    expect(requests[0]!.text()).toBe('요청 대기 중')
    expect(requests[0]!.attributes('disabled')).toBeUndefined()
    expect(friends.map(friend => friend.userId)).toEqual(['friend-a', 'friend-b', 'friend-c'])
    await requests[0]!.trigger('click')
    expect(wrapper.findAll('p').filter(item => item.text().startsWith('친구 ')).map(card => card.text()))
      .toEqual(['친구 A', '친구 B', '친구 C'])
  })
})
