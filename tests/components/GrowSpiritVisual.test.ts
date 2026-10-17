import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import GrowSpiritVisual from '~/components/grow/GrowSpiritVisual.vue'

describe('GrowSpiritVisual', () => {
  it.each(['tomato-vine', 'unknown'])('종이 %s이면 공개 코드가 있어도 기존 그림을 표시한다', async (speciesCode) => {
    const wrapper = await mountSuspended(GrowSpiritVisual, {
      props: { speciesCode, nameKo: '기존 종', revealedSpiritCode: 'dino', tier: 'stage1' },
    })
    expect(wrapper.find('img[src="/spirits/dino-stage1.png"]').exists()).toBe(false)
    if (speciesCode === 'tomato-vine') expect(wrapper.find('svg').exists()).toBe(true)
    else expect(wrapper.get('img').attributes('src')).toMatch(/\/unknown\.(gif|png)$/)
    wrapper.unmount()
  })

  it.each([undefined, null])('공개 코드 %s이면 기존 고양이 그림을 표시한다', async (revealedSpiritCode) => {
    const wrapper = await mountSuspended(GrowSpiritVisual, {
      props: { speciesCode: 'cat', nameKo: '수수께끼 정령', revealedSpiritCode, tier: 'stage1' },
    })
    expect(wrapper.get('img').attributes('src')).toBe('/spirits/stage1.png')
    await wrapper.setProps({ tier: 'stage2' })
    expect(wrapper.get('img').attributes('src')).toBe('/spirits/stage2.png')
    wrapper.unmount()
  })

  it('공개 종이 공룡이면 해당 단계 그림을 표시한다', async () => {
    const wrapper = await mountSuspended(GrowSpiritVisual, {
      props: { speciesCode: 'cat', nameKo: '공룡 정령', revealedSpiritCode: 'dino', tier: 'stage1' },
    })
    expect(wrapper.get('img').attributes('src')).toBe('/spirits/dino-stage1.png')
    await wrapper.setProps({ tier: 'stage2' })
    expect(wrapper.get('img').attributes('src')).toBe('/spirits/dino-stage2.png')
    wrapper.unmount()
  })
})
