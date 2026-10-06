import { afterEach, describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import JarCarousel from '~/components/terrarium/JarCarousel.vue'
import type { JarLevel } from '~/utils/tierLevels'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// 홈 병 캐러셀 슬라이드 구성 — 항상 Lv.1/Lv.2/Lv.3 한 장씩, 활성 레벨만 라이브 스테이지(slot), 나머지는 카드.
function level(overrides: Partial<JarLevel> & { level: number }): JarLevel {
  const { level: lv } = overrides
  return {
    tier: ['', 'BASIC_JAR', 'LARGE_JAR', 'GRAND_TANK'][lv] ?? `TIER_${lv}`,
    nameKo: `병 ${lv}`,
    rubyCost: lv * 10,
    slots: lv * 10,
    spiritCode: null,
    unlocked: lv === 1,
    active: lv === 1,
    prevUnlocked: true,
    descriptionKo: '',
    ...overrides,
  }
}

/** 활성 레벨 + 해금된 최고 레벨로 카탈로그 3장을 만든다 */
function catalog(active: number, unlockedUpTo: number): JarLevel[] {
  return [1, 2, 3].map(lv => level({
    level: lv,
    unlocked: lv <= unlockedUpTo,
    active: lv === active,
    prevUnlocked: lv === 1 || lv - 1 <= unlockedUpTo,
  }))
}

async function mount(levels: JarLevel[], selectedLevel: number, locked = false) {
  return mountSuspended(JarCarousel, {
    props: { levels, selectedLevel, locked },
    slots: { default: '<div data-testid="live-stage">STAGE</div>' },
  })
}

function slideLevels(wrapper: Awaited<ReturnType<typeof mount>>): string[] {
  return wrapper.findAll('[data-testid^="jar-slide-"]').map((el) => {
    const id = el.attributes('data-testid')!
    return id === 'jar-slide-current' ? `live:${el.attributes('data-level')}` : `card:${id.replace('jar-slide-', '')}`
  })
}

describe('JarCarousel 슬라이드 구성', () => {
  it.each([true, false, undefined])('도트 클릭은 모션 축소 선호에 맞는 스크롤을 요청한다 (%s)', async (reduce) => {
    if (reduce === undefined) vi.stubGlobal('matchMedia', undefined)
    else vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query === '(prefers-reduced-motion: reduce)' && reduce }) as MediaQueryList)
    const wrapper = await mount(catalog(1, 1), 1)
    const track = wrapper.get('[data-testid="jar-carousel"]').element as HTMLElement
    Object.defineProperty(track, 'clientWidth', { value: 393, configurable: true })
    const scroll = vi.fn()
    track.scrollTo = scroll
    await wrapper.get('button[aria-label="Lv.2 슬라이드"]').trigger('click')
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ left: 393, behavior: reduce ? 'instant' : 'smooth' })
    wrapper.unmount()
  })

  it('active=1 (Lv.2/3 잠김) — 라이브 Lv.1 + 잠금 카드 Lv.2/Lv.3', async () => {
    const wrapper = await mount(catalog(1, 1), 1)
    expect(slideLevels(wrapper)).toEqual(['live:1', 'card:2', 'card:3'])
    expect(wrapper.find('[data-testid="live-stage"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-card-unlock-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-card-unlock-3"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('루비 20개를 사용하여')
    // 도트 3개 — Lv 별 라벨
    expect(wrapper.findAll('button[aria-pressed]')).toHaveLength(3)
  })

  it('active=2 (Lv.2 해금) — Lv.1 은 해금 카드(되돌아가기), Lv.2 라이브, Lv.3 잠금 카드', async () => {
    const wrapper = await mount(catalog(2, 2), 2)
    expect(slideLevels(wrapper)).toEqual(['card:1', 'live:2', 'card:3'])
    // 활성 병은 카드로 중복되지 않는다
    expect(wrapper.find('[data-testid="jar-card-select-2"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="jar-card-unlock-2"]').exists()).toBe(false)
    // Lv.1 카드 탭 = 전환(select) — 사용자가 Lv.1 로 돌아올 수 있다
    await wrapper.find('[data-testid="jar-card-select-1"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ level: 1 })
    expect(wrapper.emitted('unlock')).toBeFalsy()
    // Lv.3 잠금 카드 탭 = unlock
    await wrapper.find('[data-testid="jar-card-unlock-3"]').trigger('click')
    expect(wrapper.emitted('unlock')?.[0]?.[0]).toMatchObject({ level: 3 })
  })

  it('active=3 (전부 해금) — Lv.1/Lv.2 해금 카드 + Lv.3 라이브', async () => {
    const wrapper = await mount(catalog(3, 3), 3)
    expect(slideLevels(wrapper)).toEqual(['card:1', 'card:2', 'live:3'])
    expect(wrapper.find('[data-testid="jar-card-select-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-card-select-2"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('해금하기')
  })

  it('active=1 인데 Lv.2 만 해금 — Lv.2 는 전환 카드, Lv.3 은 잠금 카드', async () => {
    const wrapper = await mount(catalog(1, 2), 1)
    expect(slideLevels(wrapper)).toEqual(['live:1', 'card:2', 'card:3'])
    expect(wrapper.find('[data-testid="jar-card-select-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-card-unlock-3"]').exists()).toBe(true)
  })

  it('카탈로그 미로드(levels 빈 배열) — 라이브 슬라이드 한 장, 도트 없음', async () => {
    const wrapper = await mount([], 1)
    expect(slideLevels(wrapper)).toEqual(['live:1'])
    expect(wrapper.findAll('button[aria-pressed]')).toHaveLength(0)
  })

  it('locked(관리/힐링) — 카드 슬라이드 숨김 + 도트 숨김, 라이브는 유지', async () => {
    const wrapper = await mount(catalog(2, 2), 2, true)
    expect(wrapper.find('[data-testid="jar-slide-current"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-slide-1"]').attributes('style')).toContain('display: none')
    expect(wrapper.find('[data-testid="jar-slide-3"]').attributes('style')).toContain('display: none')
    expect(wrapper.findAll('button[aria-pressed]')).toHaveLength(0)
  })
})

describe('JarCarousel 짧은 스와이프 페이징', () => {
  // snap-mandatory 만으로는 폭 절반 미만 스와이프가 제자리로 스냅되던 문제(폰 QA) — 손을 뗄 때 가로 이동량으로 넘긴다.
  async function setup(scrollLeft = 393) {
    const wrapper = await mount(catalog(1, 1), 1)
    const track = wrapper.get('[data-testid="jar-carousel"]')
    const el = track.element as HTMLElement
    Object.defineProperty(el, 'clientWidth', { value: 393, configurable: true })
    el.scrollLeft = scrollLeft
    const scroll = vi.fn()
    el.scrollTo = scroll
    const swipe = async (dx: number, dy = 0) => {
      await track.trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
      await track.trigger('touchend', { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] })
    }
    return { wrapper, track, el, scroll, swipe }
  }

  it.each([[-40, 2], [-60, 2], [40, 0]])('가로 %ipx 스와이프 → 슬라이드 %i 로 이동', async (dx, target) => {
    const { wrapper, scroll, swipe } = await setup()
    await swipe(dx)
    expect(scroll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ left: target * 393 }))
    wrapper.unmount()
  })

  it('임계값 미만·세로 위주 스와이프는 네이티브 스냅에 맡긴다', async () => {
    const { wrapper, scroll, swipe } = await setup()
    await swipe(-10)
    await swipe(-40, 80)
    expect(scroll).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('양 끝에서는 범위를 넘지 않는다', async () => {
    const { wrapper, scroll, swipe } = await setup(2 * 393)
    await swipe(-80)
    expect(scroll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ left: 2 * 393 }))
    wrapper.unmount()
  })

  it('스와이프 직후의 카드 click 은 전환/해금으로 이어지지 않고, 그냥 탭은 동작한다', async () => {
    const { wrapper, swipe } = await setup()
    await swipe(-60)
    await wrapper.get('[data-testid="jar-card-unlock-3"]').trigger('click')
    expect(wrapper.emitted('unlock')).toBeUndefined()
    await new Promise(r => setTimeout(r, 450))
    await wrapper.get('[data-testid="jar-card-unlock-3"]').trigger('click')
    expect(wrapper.emitted('unlock')).toHaveLength(1)
    wrapper.unmount()
  })

  it('locked(관리/힐링) 이면 스와이프로 넘기지 않는다', async () => {
    const wrapper = await mount(catalog(2, 2), 2, true)
    const track = wrapper.get('[data-testid="jar-carousel"]')
    const scroll = vi.fn();
    (track.element as HTMLElement).scrollTo = scroll
    await track.trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
    await track.trigger('touchend', { changedTouches: [{ clientX: 100, clientY: 300 }] })
    expect(scroll).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
