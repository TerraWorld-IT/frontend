import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { STORAGE_KEYS } from '~/utils/constants'
import { readDraft } from '~/utils/draftStorage'
import { ref } from 'vue'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'

vi.mock('~/stores/user', () => ({ useUserStore: () => ({ me: { userId: 'habit-user' } }) }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref<{ data: null }>({ data: null }) } }))

const wrappers: VueWrapper[] = []

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('HabitCreateSheet', () => {
  it('친구 조회 대기와 실패 중에는 다음을 막고 조회 성공 뒤 다시 활성화한다', async () => {
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, initialMode: 'friend', friends: [], loading: true },
      global: { stubs: { CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('함께 독서')
    const next = wrapper.findAll('button').find(button => button.text() === '다음')!
    expect(next.attributes('disabled')).toBeDefined()
    await wrapper.setProps({ loading: false, loadError: true })
    expect(next.attributes('disabled')).toBeDefined()
    await wrapper.setProps({ loadError: false })
    expect(next.attributes('disabled')).toBeUndefined()
  })

  it('혼자 모드는 친구 조회 실패 중에도 생성할 수 있다', async () => {
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, initialMode: 'solo', friends: [], loadError: true },
      global: { stubs: { CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('독서')
    const create = wrapper.findAll('button').find(button => button.text() === '생성 하기')!
    expect(create.attributes('disabled')).toBeUndefined()
    await create.trigger('click')
    expect(wrapper.emitted('submit')).toEqual([[{ title: '독서', friendUserId: null }]])
  })

  it('친구 탭에서 열면 친구 모드를 유지하고 solo 진행 중에도 친구 요청을 제출한다', async () => {
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, initialMode: 'friend', soloUnavailable: true, friends: [{ userId: 'friend-a', nickname: '친구 A' }] },
      global: { stubs: { CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    const solo = wrapper.findAll('button').find(button => button.text().includes('나의 습관'))!
    expect(solo.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button').find(button => button.text().includes('친구와'))!.attributes('aria-pressed')).toBe('true')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('함께 독서')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '요청하기')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '요청 보내기')!.trigger('click')
    expect(wrapper.emitted('submit')).toEqual([[{ title: '함께 독서', friendUserId: 'friend-a' }]])
  })

  it('열린 시트에서도 선택 모드가 사용 중으로 바뀌면 제출을 차단한다', async () => {
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, initialMode: 'solo', friends: [] },
      global: { stubs: { CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('독서')
    await wrapper.setProps({ soloUnavailable: true })
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.findAll('button').find(button => button.text() === '생성 하기')!.attributes('disabled')).toBeDefined()
  })

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

  it('유형과 친구 선택을 계정별로 복원하고 자동 요청하지 않는다', async () => {
    const key = `${STORAGE_KEYS.DRAFT_HABIT_TITLE}habit-user`
    const selectionKey = `${STORAGE_KEYS.DRAFT_HABIT_SELECTION}habit-user`
    const wrapper = await mountSuspended(HabitCreateSheet, {
      props: { open: true, friends: [{ userId: 'friend-a', nickname: '친구 A' }] },
      global: { stubs: { CommonBottomSheet: { props: ['open'], template: '<section v-if="open"><slot/><slot name="footer"/></section>' } } },
    })
    wrappers.push(wrapper)
    await wrapper.findAll('button').find(button => button.text().includes('친구와'))!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.get('input').setValue('함께 걷기')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '요청하기')!.trigger('click')
    await wrapper.setProps({ open: false })
    expect(readDraft(key)).toBe('함께 걷기')
    expect(readDraft(selectionKey)).toEqual({ mode: 'friend', selectedFriendId: 'friend-a' })
    expect(readDraft(`${STORAGE_KEYS.DRAFT_HABIT_TITLE}another-user`)).toBeNull()
    expect(readDraft(`${STORAGE_KEYS.DRAFT_HABIT_SELECTION}another-user`)).toBeNull()
    await wrapper.setProps({ open: true })
    expect(wrapper.findAll('button').find(button => button.text().includes('친구와'))!.attributes('aria-pressed')).toBe('true')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    expect(wrapper.get('input').element.value).toBe('함께 걷기')
    await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
    expect(wrapper.findAll('button').filter(button => button.text() === '선택됨')).toHaveLength(1)
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.setProps({ friends: [] })
    expect(wrapper.findAll('button').find(button => button.text() === '요청 보내기')!.attributes('disabled')).toBeDefined()
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
