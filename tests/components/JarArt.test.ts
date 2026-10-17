import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import JarArt from '~/components/terrarium/JarArt.vue'

// 병 아트 — 레벨별 병 이미지 경로, 범위 밖 레벨 보정, 장식 이미지 접근성.
describe('JarArt', () => {
  it('레벨에 맞는 병 이미지를 그린다', async () => {
    const base = await mountSuspended(JarArt, { props: { level: 2 } })
    const img = base.find('img')
    expect(img.attributes('src')).toBe('/jar/lv2.webp')
    expect(img.attributes('alt')).toBe('')
    expect(img.attributes('aria-hidden')).toBe('true')
    expect(img.classes()).not.toContain('pointer-events-none')

    const level3 = await mountSuspended(JarArt, { props: { level: 3 } })
    expect(level3.find('img').attributes('src')).toBe('/jar/lv3.webp')
  })

  it('레벨이 범위를 벗어나면 1~3 으로 보정한다', async () => {
    expect((await mountSuspended(JarArt, { props: { level: 0 } })).find('img').attributes('src')).toBe('/jar/lv1.webp')
    expect((await mountSuspended(JarArt, { props: { level: 7 } })).find('img').attributes('src')).toBe('/jar/lv3.webp')
    expect((await mountSuspended(JarArt)).find('img').attributes('src')).toBe('/jar/lv1.webp')
  })
})
