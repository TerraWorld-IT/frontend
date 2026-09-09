import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, type Component } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import CalendarPage from '~/pages/calendar/index.vue'
import { clearNuxtData } from '#app'
import SharePage from '~/pages/share/[code].vue'
import FriendsPage from '~/pages/friends/index.vue'
import TerrariumView from '~/components/friends/TerrariumView.vue'
import type { ShareResponse } from '@terraworld-it/openapi-frontend'
import LoginPage from '~/pages/auth/login.vue'

const mocks = vi.hoisted(() => ({
  signedIn: false,
  route: { params: { code: 'ABCD1234' }, query: {} as Record<string, unknown> },
  sdk: Object.fromEntries(['getSharedTerrarium', 'acceptInvite', 'listCategories', 'listFriends', 'createRecord', 'getRecordStatistics', 'listRecords', 'getNote', 'saveNote', 'deleteNote', 'getUnreadNotificationCount'].map(key => [key, vi.fn()])),
  user: { me: { userId: 'u1', nickname: '테스트', currency: {}, ownedItems: [], entitlements: { freePlacement: true } }, fetchMe: vi.fn(), updateCurrency: vi.fn() },
  home: { snapshot: { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [] } }, fetch: vi.fn(), invalidate: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  routeLeave: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), getSession: vi.fn(async () => ({ data: null })), navigate: vi.fn(),
}))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: mocks.routeLeave }))
vi.mock('~/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => ({ items: [], fetchAll: vi.fn() }) }))
vi.mock('~/stores/homeSnapshot', () => ({ useHomeSnapshotStore: () => mocks.home }))
vi.mock('~/lib/auth-client', () => ({ authClient: { useSession: () => ref<{ data: null }>({ data: null }), getSession: mocks.getSession, signIn: { email: mocks.signIn }, signUp: { email: mocks.signUp } } }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('dismissKeyboard', () => vi.fn())
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useGtagEvents', () => () => new Proxy({}, { get: () => vi.fn() }))
mockNuxtImport('useNative', () => () => ({ isNative: false, hapticImpact: vi.fn(), registerPushIfGranted: vi.fn(async () => undefined) }))
mockNuxtImport('useRoute', () => () => mocks.route)
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref<boolean>(mocks.signedIn), loadJwt: vi.fn(async () => 'test-token') }))
mockNuxtImport('useHabits', () => () => ({ trackers: ref<never[]>([]), loaded: ref<boolean>(true), loadError: ref<boolean>(false), load: vi.fn() }))
mockNuxtImport('useAttendance', () => () => ({ state: ref<null>(null), loading: ref<boolean>(false), error: ref<string | null>(null), refresh: vi.fn() }))
mockNuxtImport('useTier', () => () => ({ state: ref<null>(null), catalog: ref<null>(null), loading: ref<boolean>(false), loadError: ref<boolean>(false), load: vi.fn() }))
mockNuxtImport('useBgm', () => () => ({ enabled: ref<boolean>(false), playing: ref<boolean>(false), hasSource: false, play: vi.fn(), stop: vi.fn() }))
mockNuxtImport('useAdMob', () => () => ({ isNative: false, isAndroid: false, isIos: false }))
mockNuxtImport('useAppUpdate', () => () => ({ updateRequired: ref<boolean>(true), isNative: false, check: vi.fn(), openStore: vi.fn() }))

const wrappers: VueWrapper[] = []
async function mountPage(component: Component) {
  const wrapper = await mountSuspended(component, {
    shallow: true, attachTo: document.body,
    global: { renderStubDefaultSlot: true, stubs: { FriendsTerrariumView: false, NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

// 기존 T2yInteractions와 같은 실제 SFC 상태 접근으로 외부 I/O만 대체한다.
function state(wrapper: VueWrapper): Record<string, any> {
  return wrapper.vm.$.setupState
}

beforeEach(() => {
  clearNuxtData()
  vi.clearAllMocks()
  mocks.signedIn = false
  mocks.route.query = {}
  mocks.user.me.userId = 'u1'
  for (const fn of Object.values(mocks.sdk)) fn.mockReset().mockResolvedValue({ data: [], error: undefined })
  mocks.sdk.listCategories!.mockResolvedValue({ data: { categories: [{ id: 1, name: '독서', isCustom: false }] } })
  mocks.sdk.listRecords!.mockResolvedValue({ data: { content: [], totalPages: 1 } })
  mocks.sdk.getRecordStatistics!.mockResolvedValue({ data: { totalRecords: 0, byCategory: [] } })
  mocks.sdk.getSharedTerrarium!.mockResolvedValue({ data: sharedResponse, response: { status: 200 } })
  mocks.sdk.getNote!.mockResolvedValue({ data: { note: '서버 메모' } })
  mocks.user.fetchMe.mockResolvedValue(undefined)
  mocks.getSession.mockResolvedValue({ data: null })
  mocks.signIn.mockResolvedValue({ error: null })
  mocks.signUp.mockResolvedValue({ error: null })
  localStorage.clear()
})
afterEach(() => {
  wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.body.innerHTML = ''
})

const sharedResponse: ShareResponse = {
  nickname: '공유 친구',
  terrarium: {
    terrariumId: 1, tier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', maxSlots: 8,
    background: { id: 1, name: '숲', assetUrl: '/backgrounds/forest.png' },
    placedItems: [],
    freePlacements: Array.from({ length: 7 }, (_, i) => ({
      placementId: i + 1, itemId: i + 1, itemName: `식물${i}`, itemImage: `/items/plant-${i}.png`,
      itemLayout: 'FOREGROUND', posX: 0.5, posY: 0.5, scale: 1.2, flipped: true, zIndex: i, isFreePlacement: true,
    })),
  },
}

describe('공유 페이지 조회와 로그인 복귀', () => {
  it.each([
    [404, '초대 코드가 만료되었거나 잘못되었을 수 있어요'],
    [410, '초대 코드가 만료되었어요. 새 초대 코드를 요청해주세요'],
  ])('%s 응답은 정확한 설명을 표시하고 재시도 버튼을 표시하지 않는다', async (status, description) => {
    mocks.sdk.getSharedTerrarium!.mockResolvedValue({ error: { message: '오류' }, response: { status } })
    const wrapper = await mountPage(SharePage)
    expect(state(wrapper).error.statusCode).toBe(status)
    expect(wrapper.text()).toContain(description)
    expect(wrapper.findAll('button').some(button => button.text() === '재시도')).toBe(false)
    expect(wrapper.findComponent(TerrariumView).exists()).toBe(false)
  })

  it.each(['500', 'network'])('%s 오류는 명시 재시도 후 공용 테라리움으로 회복한다', async (failure) => {
    if (failure === '500') mocks.sdk.getSharedTerrarium!.mockResolvedValueOnce({ error: {}, response: { status: 500 } })
    else mocks.sdk.getSharedTerrarium!.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const wrapper = await mountPage(SharePage)
    expect(wrapper.text()).toContain('일시적인 오류 입니다. 잠시 후에 다시 시도해 주세요.')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(mocks.sdk.getSharedTerrarium).toHaveBeenCalledTimes(2)
    const view = wrapper.getComponent(TerrariumView)
    expect(view.props('terrarium')).toMatchObject(sharedResponse.terrarium)
    expect(view.findAll('img')).toHaveLength(8)
    expect(view.get('img[alt="식물0"]').attributes('src')).toBe('/items/plant-0.png')
    expect(view.get('img[alt="식물0"]').element.parentElement!.getAttribute('style')).toContain('scale(1.2) scaleX(-1)')
    expect(view.get('img[alt="식물0"]').element.parentElement!.parentElement!.getAttribute('style')).toContain('left: 152px')
  })

  it.each([false, true])('세션 보유=%s에 따라 로그인 복귀 링크와 명시 수락 버튼을 구분한다', async (signedIn) => {
    mocks.signedIn = signedIn
    const wrapper = await mountPage(SharePage)
    expect(wrapper.find('a[href="/auth/login?redirect=/share/ABCD1234"]').exists()).toBe(!signedIn)
    expect(wrapper.text().includes('초대 수락하기')).toBe(signedIn)
    expect(mocks.sdk.acceptInvite).not.toHaveBeenCalled()
  })

  it.each(['login', 'signup'])('%s 성공은 허용된 공유 경로로 돌아간다', async (mode) => {
    mocks.route.query.redirect = '/share/ABCD1234'
    const s = state(await mountPage(LoginPage))
    s.mode = mode
    s.nickname = '닉네임'
    s.email = 'user@example.com'
    s.password = 'password123'
    s.birthDate = '2000-01-01'
    s.agreeTerms = true
    s.agreePrivacy = true
    await s.onSubmit()
    expect(mocks.navigate).toHaveBeenCalledWith('/share/ABCD1234')
    expect(mocks.sdk.acceptInvite).not.toHaveBeenCalled()
  })

  it.each(['https://evil.example', '//evil.example', '/share/a?next=evil', '/share/a/b', '/share/', `/share/${'a'.repeat(65)}`, ['/share/ABCD1234']])('허용되지 않은 redirect %s는 홈으로 돌아간다', async (redirect) => {
    mocks.route.query.redirect = redirect
    const s = state(await mountPage(LoginPage))
    s.email = 'user@example.com'
    s.password = 'password123'
    await s.onSubmit()
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })
})

describe('입력과 접근성 연결', () => {
  it('가입 4개 label과 id, 이메일 키보드 속성, 닉네임 제한·안내를 연결한다', async () => {
    const wrapper = await mountPage(LoginPage)
    state(wrapper).mode = 'signup'
    await nextTick()
    for (const field of ['nickname', 'birthDate', 'email', 'password']) {
      expect(wrapper.get(`label[for="auth-${field}"]`).text()).not.toBe('')
      expect(wrapper.get(`#auth-${field}`).element.tagName).toBe('INPUT')
    }
    expect(wrapper.get('#auth-email').attributes()).toMatchObject({ inputmode: 'email', enterkeyhint: 'next' })
    expect(wrapper.get('#auth-nickname').attributes()).toMatchObject({ maxlength: '20', autocapitalize: 'none', 'aria-describedby': 'nickname-hint' })
    expect(wrapper.get('#nickname-hint').text()).toBe('닉네임은 1~20자로 입력해주세요')
  })

  it('초대 입력은 제목과 연결되고 조합 Enter·중복 Enter를 수락하지 않는다', async () => {
    const wrapper = await mountPage(FriendsPage)
    const input = wrapper.get('input[aria-labelledby="invite-code-title"]')
    expect(wrapper.findAll('#invite-code-title')).toHaveLength(1)
    expect(wrapper.get('#invite-code-title').text()).toBe('친구 코드 입력')
    expect(input.attributes()).toMatchObject({ enterkeyhint: 'done', inputmode: 'text', autocapitalize: 'characters', autocomplete: 'off' })
    await input.setValue('ABCD1234')
    await input.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(mocks.sdk.acceptInvite).not.toHaveBeenCalled()
    let resolve!: (value: unknown) => void
    mocks.sdk.acceptInvite!.mockReturnValueOnce(new Promise(done => { resolve = done }))
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(mocks.sdk.acceptInvite).toHaveBeenCalledTimes(1)
    resolve({ error: { message: '실패' } })
    await flushPromises()
  })

  it('캘린더 월·메뉴·편집 취소 이름과 메모 레이블을 연결한다', async () => {
    const wrapper = await mountPage(CalendarPage)
    const s = state(wrapper)
    expect(wrapper.get('[aria-label="이전 달"]').element.tagName).toBe('BUTTON')
    expect(wrapper.get('[aria-label="다음 달"]').element.tagName).toBe('BUTTON')
    await s.selectDay(10)
    s.monthRecords = [{ id: 1, title: '독서', recordType: 'DIARY', categoryName: '독서', recordedDate: s.dateKey(10) }]
    s.startEdit()
    await nextTick()
    expect(wrapper.get('label[for="calendar-memo"]').text()).toBe('메모')
    expect(wrapper.get('#calendar-memo').element.tagName).toBe('TEXTAREA')
    expect(wrapper.get('[aria-label="메모 편집 취소"]').element.tagName).toBe('BUTTON')
    const menu = wrapper.get('[aria-label="기록 메뉴"]')
    expect(menu.attributes()).toMatchObject({ 'aria-haspopup': 'menu', 'aria-expanded': 'false' })
    await menu.trigger('click')
    expect(menu.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="menu"]').find('[role="menuitem"]').exists()).toBe(true)
  })
})
