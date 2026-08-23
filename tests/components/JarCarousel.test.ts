import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import JarCarousel from '~/components/terrarium/JarCarousel.vue'
import type { JarLevel } from '~/utils/tierLevels'

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
  it('active=1 (Lv.2/3 잠김) — 라이브 Lv.1 + 잠금 카드 Lv.2/Lv.3', async () => {
    const wrapper = await mount(catalog(1, 1), 1)
    expect(slideLevels(wrapper)).toEqual(['live:1', 'card:2', 'card:3'])
    expect(wrapper.find('[data-testid="live-stage"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-card-unlock-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-card-unlock-3"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('루비 20개를 사용하여')
    // 도트 3개 — Lv 별 라벨
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3)
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
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0)
  })

  it('locked(관리/힐링) — 카드 슬라이드 숨김 + 도트 숨김, 라이브는 유지', async () => {
    const wrapper = await mount(catalog(2, 2), 2, true)
    expect(wrapper.find('[data-testid="jar-slide-current"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="jar-slide-1"]').attributes('style')).toContain('display: none')
    expect(wrapper.find('[data-testid="jar-slide-3"]').attributes('style')).toContain('display: none')
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0)
  })
})
