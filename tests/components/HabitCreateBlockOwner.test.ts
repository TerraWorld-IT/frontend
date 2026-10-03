import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import HabitCreateSheet from '~/components/record/HabitCreateSheet.vue'
import { BLOCKS_STORAGE_PREFIX } from '~/composables/useUserBlocks'

// 사용자 정보 스토어가 비어 있는 채로 기록 화면에 들어와도(record/index.vue 는 세션이 있으면 fetchMe 를 생략한다)
// 세션의 사용자 ID 로 차단 목록이 적용되어 차단한 회원이 습관 친구 선택에 나타나지 않는지 검증한다.
const session = ref<{ data: { user: { id: string } } | null }>({ data: { user: { id: 'me-id' } } })
const mocks = vi.hoisted(() => ({
  store: null as null | { me: { userId: string } | null },
}))

vi.mock('~/stores/user', async () => {
  const { reactive } = await import('vue')
  mocks.store = reactive({ me: null as { userId: string } | null })
  return { useUserStore: () => mocks.store }
})
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => session } }))

const wrappers: VueWrapper[] = []
const FRIENDS = [
  { userId: 'blocked-friend', nickname: '차단친구' },
  { userId: 'ok-friend', nickname: '정상친구' },
]

function blockLocally(owner: string, ...ids: string[]) {
  localStorage.setItem(BLOCKS_STORAGE_PREFIX + owner, JSON.stringify(ids.map(userId => ({ userId, nickname: userId, blockedAt: '2026-10-03T00:00:00.000Z' }))))
}

async function openFriendStep(): Promise<VueWrapper> {
  const wrapper = await mountSuspended(HabitCreateSheet, {
    props: { open: true, initialMode: 'friend', friends: FRIENDS },
    global: { stubs: { CommonBottomSheet: { template: '<section><slot/><slot name="footer"/></section>' } } },
  })
  wrappers.push(wrapper)
  await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
  await wrapper.get('input').setValue('함께 독서')
  await wrapper.findAll('button').find(button => button.text() === '다음')!.trigger('click')
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  clearNuxtState('tw-user-blocks')
  localStorage.clear()
  session.value = { data: { user: { id: 'me-id' } } }
  mocks.store!.me = null
})

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('습관 친구 선택의 차단 필터 — 회원 ID 확보', () => {
  it('스토어가 비어 있어도 세션 사용자 ID 의 차단 목록으로 차단한 회원을 숨긴다', async () => {
    blockLocally('me-id', 'blocked-friend')
    const wrapper = await openFriendStep()
    expect(wrapper.text()).toContain('정상친구')
    expect(wrapper.text()).not.toContain('차단친구')
  })

  it('스토어에 회원 정보가 있으면 스토어의 회원 ID 를 우선한다', async () => {
    mocks.store!.me = { userId: 'store-id' }
    blockLocally('me-id', 'ok-friend')
    blockLocally('store-id', 'blocked-friend')
    const wrapper = await openFriendStep()
    expect(wrapper.text()).toContain('정상친구')
    expect(wrapper.text()).not.toContain('차단친구')
  })

  it('세션도 스토어도 비어 있으면 회원을 알 수 없어 거르지 않는다', async () => {
    session.value = { data: null }
    blockLocally('me-id', 'blocked-friend')
    const wrapper = await openFriendStep()
    expect(wrapper.text()).toContain('차단친구')
  })
})
