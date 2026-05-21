// UltraPlan M17 — component spec
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RarityBadge from '~/components/common/RarityBadge.vue'

describe('RarityBadge (common)', () => {
  it('COMMON 은 "일반" label + ◌ icon + rarity-common border', async () => {
    const wrapper = await mountSuspended(RarityBadge, { props: { rarity: 'COMMON' } })
    expect(wrapper.text()).toContain('일반')
    expect(wrapper.text()).toContain('◌')
    expect(wrapper.html()).toContain('border-rarity-common')
  })

  it('RARE 은 "희귀" label + ✦ icon + rarity-rare border', async () => {
    const wrapper = await mountSuspended(RarityBadge, { props: { rarity: 'RARE' } })
    expect(wrapper.text()).toContain('희귀')
    expect(wrapper.text()).toContain('✦')
    expect(wrapper.html()).toContain('border-rarity-rare')
  })

  it('EPIC 은 "판타지" label + ✧ icon + rarity-epic border', async () => {
    const wrapper = await mountSuspended(RarityBadge, { props: { rarity: 'EPIC' } })
    expect(wrapper.text()).toContain('판타지')
    expect(wrapper.text()).toContain('✧')
    expect(wrapper.html()).toContain('border-rarity-epic')
  })

  it('lowercase rarity 도 정상 처리 (toUpperCase)', async () => {
    const wrapper = await mountSuspended(RarityBadge, { props: { rarity: 'rare' } })
    expect(wrapper.text()).toContain('희귀')
  })

  it('aria-label 에 정확한 희귀도 label 포함', async () => {
    const wrapper = await mountSuspended(RarityBadge, { props: { rarity: 'EPIC' } })
    expect(wrapper.attributes('aria-label')).toBe('희귀도 판타지')
  })
})
