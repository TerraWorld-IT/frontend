import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'
import RecordCompleteToast from '~/components/record/RecordCompleteToast.vue'
import { calculatePinchScale } from '~/pages/index.vue'

const wrappers: VueWrapper[] = []

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('WP3-F 피그마 정합', () => {
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

  it('A-03 거리 비율에 따라 확대·축소하며 기존 한계와 겹친 포인터를 처리한다', () => {
    expect(calculatePinchScale(1, 100, 150)).toBe(1.5)
    expect(calculatePinchScale(1.5, 150, 100)).toBe(1)
    expect(calculatePinchScale(1, 100, 1000)).toBe(2)
    expect(calculatePinchScale(1, 100, 1)).toBe(0.5)
    expect(calculatePinchScale(1.2, 0, 100)).toBe(1.2)
    expect(calculatePinchScale(1.2, 100, 0)).toBe(1.2)
    expect(calculatePinchScale(1.2, Number.NaN, 100)).toBe(1.2)
  })

  it.each([
    ['dew', '이슬'], ['sun', '햇살'], ['bolt', '번개'], ['wind', '바람'],
  ] as const)('A-07 %s 완료 토스트는 기존 PNG를 표시하고 서버 지급 문구를 유지한다', async (kind, name) => {
    const wrapper = await mountSuspended(RecordCompleteToast, {
      props: { open: true, kind, count: 3 },
      global: { stubs: { RecordCompleteBurst: true } },
    })
    wrappers.push(wrapper)
    const status = document.body.querySelector('[role="status"]')!
    expect(status.querySelector('img')!.getAttribute('src')).toBe(`/icons/token/mini/${kind}.png`)
    expect(status.querySelector('img')!.getAttribute('width')).toBe('24')
    expect(status.textContent).toContain(`${name}토큰 3개 획득!`)
    await wrapper.setProps({ count: null })
    expect(status.textContent).toContain(`${name}토큰 획득!`)
    await wrapper.setProps({ open: false })
    expect(document.body.querySelector('[role="status"]')).toBeNull()
  })
})
