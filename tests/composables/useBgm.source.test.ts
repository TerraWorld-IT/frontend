import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#app'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { useBgm, BGM_STORAGE_KEY } from '~/composables/useBgm'
import HomePage from '~/pages/index.vue'

const mocks = vi.hoisted(() => ({
  bgmUrl: 'https://cdn.example/bgm.mp3',
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
  user: { me: { nickname: '테스트', currency: {}, ownedItems: [], entitlements: {} }, fetchMe: vi.fn() },
  items: { items: [], fetchAll: vi.fn() },
  home: { snapshot: { terrarium: { placedItems: [], maxSlots: 6 }, freePlacements: { items: [] } }, fetch: vi.fn() },
}))
vi.mock('~/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => mocks.items }))
vi.mock('~/stores/homeSnapshot', () => ({ useHomeSnapshotStore: () => mocks.home }))
vi.mock('vue-router', async () => ({ ...(await vi.importActual('vue-router')), onBeforeRouteLeave: vi.fn() }))
mockNuxtImport('useAuth', () => () => ({ isLoggedIn: ref<boolean>(true) }))
mockNuxtImport('useOpenApi', () => () => ({ sdk: {}, client: {} }))
mockNuxtImport('useToast', () => () => mocks.toast)
mockNuxtImport('useGtagEvents', () => () => new Proxy({}, { get: () => vi.fn() }))
mockNuxtImport('useNative', () => () => ({ isNative: false, hapticImpact: vi.fn() }))
mockNuxtImport('useAttendance', () => () => ({ state: ref<null>(null), loading: ref<boolean>(false), refresh: vi.fn() }))
mockNuxtImport('useTier', () => () => ({ state: ref<null>(null), catalog: ref<null>(null), load: vi.fn() }))

// Nuxt 테스트 앱의 다른 public 설정은 보존하고 음원 키만 채운다.
mockNuxtImport('useRuntimeConfig', () => () => {
  const config = useNuxtApp().$config
  return { ...config, public: { ...config.public, bgmUrl: mocks.bgmUrl } }
})

const wrappers: VueWrapper[] = []
let audio: PendingAudio

class PendingAudio {
  loop = false
  preload = ''
  currentTime = 0
  paused = true
  pending: Array<{ resolve: () => void, reject: (reason: Error) => void }> = []

  constructor(readonly src: string) {}

  play = vi.fn(() => new Promise<void>((resolve, reject) => {
    this.pending.push({ resolve: () => { this.paused = false; resolve() }, reject })
  }))

  pause = vi.fn(() => { this.paused = true })
}

async function mountBgm() {
  let api!: ReturnType<typeof useBgm>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      api = useBgm()
      return () => h('div')
    },
  }))
  wrappers.push(wrapper)
  return { bgm: api, wrapper }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.bgmUrl = 'https://cdn.example/bgm.mp3'
  vi.stubGlobal('Audio', vi.fn(function (src: string) {
    audio = new PendingAudio(src)
    return audio
  }))
})

async function mountHome() {
  const wrapper = await mountSuspended(HomePage, { shallow: true, global: { renderStubDefaultSlot: true } })
  wrappers.push(wrapper)
  await flushPromises()
  // 실제 페이지의 비공개 setup 상태는 테스트에서만 접근한다.
  const state = wrapper.vm.$.setupState as {
    healingMode: boolean
    bgmStatus: 'nosource' | 'off' | 'on' | 'blocked'
    enterHealingMode: () => void
    onHealingIntroDone: () => Promise<void>
  }
  return { wrapper, state }
}

describe('홈 BGM 상태와 토글', () => {
  it.each([null, '0', '1'])('음원이 없으면 안내만 하고 저장된 선호 %s를 보존한다', async (saved) => {
    mocks.bgmUrl = ''
    if (saved !== null) localStorage.setItem(BGM_STORAGE_KEY, saved)
    const { wrapper, state } = await mountHome()
    state.healingMode = true
    await nextTick()
    const toggle = wrapper.get('[data-testid="home-bgm-toggle"]')
    expect(state.bgmStatus).toBe('nosource')
    expect(toggle.attributes('aria-label')).toBe('음원 준비 중')
    expect(toggle.attributes('aria-disabled')).toBe('true')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.attributes('style')).toContain('var(--color-apjek-bg)')
    expect(toggle.find('[name="lucide:volume-x"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-healing-bar"]').text()).toContain('음원 준비 중')
    await toggle.trigger('click')
    await flushPromises()
    expect(localStorage.getItem(BGM_STORAGE_KEY)).toBe(saved)
    expect(mocks.toast.info).toHaveBeenCalledWith('음원 준비 중')
  })

  it('실제 재생만 ON의 스타일·접근성·아이콘·텍스트를 구동하고 힐링 종료는 정지한다', async () => {
    const { wrapper, state } = await mountHome()
    state.enterHealingMode()
    const play = state.onHealingIntroDone()
    audio.pending[0]!.resolve()
    await play
    await nextTick()
    const toggle = wrapper.get('[data-testid="home-bgm-toggle"]')
    expect(state.bgmStatus).toBe('on')
    expect(toggle.attributes('aria-label')).toBe('음악 끄기')
    expect(toggle.attributes('aria-disabled')).toBe('false')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.attributes('style')).toContain('var(--color-apjek-blue)')
    expect(toggle.find('[name="lucide:music"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-healing-bar"]').text()).toContain('음악 ON')
    expect(mocks.toast.info).not.toHaveBeenCalled()
    await toggle.trigger('click')
    await flushPromises()
    expect(state.bgmStatus).toBe('off')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(localStorage.getItem(BGM_STORAGE_KEY)).toBe('0')
    await toggle.trigger('click')
    audio.pending[1]!.resolve()
    await flushPromises()
    expect(state.bgmStatus).toBe('on')
    state.healingMode = false
    await nextTick()
    expect(audio.paused).toBe(true)
    expect(audio.currentTime).toBe(0)
  })

  it('재생 거부는 OFF 표시와 안내 1회이며 재시도 실패도 안내를 반복하지 않는다', async () => {
    const { wrapper, state } = await mountHome()
    state.enterHealingMode()
    const play = state.onHealingIntroDone()
    audio.pending[0]!.reject(new Error('blocked'))
    await play
    await nextTick()
    const toggle = wrapper.get('[data-testid="home-bgm-toggle"]')
    expect(state.bgmStatus).toBe('blocked')
    expect(toggle.attributes('aria-label')).toBe('음악 켜기')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.attributes('style')).toContain('var(--color-apjek-bg)')
    expect(toggle.find('[name="lucide:volume-x"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-healing-bar"]').text()).toContain('음악 OFF')
    expect(mocks.toast.info).toHaveBeenCalledTimes(1)
    await toggle.trigger('click')
    await flushPromises()
    await toggle.trigger('click')
    audio.pending[1]!.reject(new Error('still blocked'))
    await flushPromises()
    expect(state.bgmStatus).toBe('blocked')
    expect(mocks.toast.info).toHaveBeenCalledTimes(1)
  })
})

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
})

describe('useBgm 음원과 비동기 재생 의도', () => {
  it('설정된 음원은 루프 재생하고 play 완료 뒤에만 playing이 true다', async () => {
    const { bgm } = await mountBgm()
    const play = bgm.play()
    expect(bgm.hasSource).toBe(true)
    expect(audio.src).toBe('https://cdn.example/bgm.mp3')
    expect(audio.loop).toBe(true)
    expect(audio.preload).toBe('auto')
    expect(bgm.playing.value).toBe(false)
    audio.pending[0]!.resolve()
    await play
    expect(bgm.playing.value).toBe(true)
    expect(audio.paused).toBe(false)
  })

  it('play → stop → resolve는 늦게 시작된 오디오도 멈추고 되감는다', async () => {
    const { bgm } = await mountBgm()
    const play = bgm.play()
    bgm.stop()
    audio.currentTime = 12
    audio.pending[0]!.resolve()
    await play
    expect(audio.pause).toHaveBeenCalledTimes(2)
    expect(audio.currentTime).toBe(0)
    expect(audio.paused).toBe(true)
    expect(bgm.playing.value).toBe(false)
  })

  it('play → stop → play → 첫 promise resolve가 새로 성공한 재생을 중단하지 않는다', async () => {
    const { bgm } = await mountBgm()
    const first = bgm.play()
    bgm.stop()
    const second = bgm.play()
    audio.pending[1]!.resolve()
    await second
    audio.currentTime = 4
    audio.pending[0]!.resolve()
    await first
    expect(bgm.playing.value).toBe(true)
    expect(audio.paused).toBe(false)
    expect(audio.currentTime).toBe(4)
    expect(audio.pause).toHaveBeenCalledTimes(1)
  })

  it('새 play가 pending이면 이전 resolve는 playing을 선점하지 않는다', async () => {
    const { bgm } = await mountBgm()
    const first = bgm.play()
    bgm.stop()
    const second = bgm.play()
    audio.pending[0]!.resolve()
    await first
    expect(bgm.playing.value).toBe(false)
    expect(audio.pause).toHaveBeenCalledTimes(1)
    audio.pending[1]!.resolve()
    await second
    expect(bgm.playing.value).toBe(true)
  })

  it('이전 play의 늦은 reject도 새 재생 상태를 덮지 않는다', async () => {
    const { bgm } = await mountBgm()
    const first = bgm.play()
    bgm.stop()
    const second = bgm.play()
    audio.pending[1]!.resolve()
    await second
    audio.pending[0]!.reject(new Error('old play aborted'))
    await first
    expect(bgm.playing.value).toBe(true)
    expect(audio.paused).toBe(false)
  })

  it('재생 거부는 선호를 보존하고 실제 재생만 false로 남긴다', async () => {
    const { bgm } = await mountBgm()
    const play = bgm.play()
    audio.pending[0]!.reject(new DOMException('blocked', 'NotAllowedError'))
    await expect(play).resolves.toBeUndefined()
    expect(bgm.enabled.value).toBe(true)
    expect(bgm.playing.value).toBe(false)
    expect(localStorage.getItem(BGM_STORAGE_KEY)).toBeNull()
  })

  it('pending 중 토글 OFF 후 resolve해도 선호 OFF와 정지를 유지한다', async () => {
    const { bgm } = await mountBgm()
    const play = bgm.play()
    await bgm.toggle()
    audio.pending[0]!.resolve()
    await play
    expect(bgm.enabled.value).toBe(false)
    expect(bgm.playing.value).toBe(false)
    expect(audio.paused).toBe(true)
    expect(localStorage.getItem(BGM_STORAGE_KEY)).toBe('0')
  })

  it('unmount 후 pending play가 완료되어도 정지 상태를 유지한다', async () => {
    const { bgm, wrapper } = await mountBgm()
    const play = bgm.play()
    wrapper.unmount()
    audio.pending[0]!.resolve()
    await play
    expect(bgm.playing.value).toBe(false)
    expect(audio.paused).toBe(true)
    expect(audio.currentTime).toBe(0)
  })
})
