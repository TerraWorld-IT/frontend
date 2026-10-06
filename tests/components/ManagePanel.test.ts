import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import ManagePanel, { type ManageTile } from '~/components/terrarium/ManagePanel.vue'

// 관리 패널 보유 타일 목록 — 타일 위에서 시작한 좌우 스와이프 보완(폰 QA).
const tiles: ManageTile[] = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `식물 ${i + 1}`, assetUrl: '', checked: false }))

async function mount() {
  const wrapper = await mountSuspended(ManagePanel, {
    props: { open: true, tab: 'items', tiles, busy: false, saving: false, maxSlots: 10, placedCount: 0 },
    attachTo: document.body,
  })
  // 패널은 Teleport 로 body 에 그려진다.
  const el = document.querySelector('[data-testid="manage-tile-scroller"]') as HTMLElement
  const scroller = new DOMWrapper(el)
  const tile = (id: number) => new DOMWrapper(document.querySelector(`[data-testid="manage-tile-${id}"]`) as HTMLElement)
  return { wrapper, scroller, el, tile }
}

const touch = (x: number, y = 100) => ({ clientX: x, clientY: y })

describe('ManagePanel 타일 목록 스와이프 보완', () => {
  it('네이티브 팬이 시작되지 않으면 손가락 이동만큼 직접 스크롤한다', async () => {
    const { wrapper, scroller, el } = await mount()
    el.scrollLeft = 0
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    for (const x of [290, 270, 250, 200]) await scroller.trigger('touchmove', { touches: [touch(x)] })
    // happy-dom 은 overflow 레이아웃이 없어 scrollLeft 클램프가 없다 — 마지막 이동량(100px)이 그대로 반영된다.
    expect(el.scrollLeft).toBe(100)
    await scroller.trigger('touchend', { changedTouches: [touch(200)] })
    wrapper.unmount()
  })

  it('네이티브 팬이 이미 움직였으면 개입하지 않는다', async () => {
    const { wrapper, scroller, el } = await mount()
    el.scrollLeft = 0
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    await scroller.trigger('touchmove', { touches: [touch(290)] })
    el.scrollLeft = 30 // 브라우저가 스크롤함
    await scroller.trigger('touchmove', { touches: [touch(270)] })
    await scroller.trigger('touchmove', { touches: [touch(200)] })
    expect(el.scrollLeft).toBe(30)
    wrapper.unmount()
  })

  it('보완 중 네이티브 팬이 뒤늦게 시작되면 즉시 손을 뗀다(이중 이동 없음)', async () => {
    const { wrapper, scroller, el } = await mount()
    el.scrollLeft = 0
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    await scroller.trigger('touchmove', { touches: [touch(270)] }) // 보완 시작 → 30
    expect(el.scrollLeft).toBe(30)
    el.scrollLeft = 55 // 네이티브가 뒤늦게 움직임
    await scroller.trigger('touchmove', { touches: [touch(250)] })
    expect(el.scrollLeft).toBe(55)
    wrapper.unmount()
  })

  it('드래그로 끝난 제스처의 click 은 타일 선택으로 이어지지 않고, 그냥 탭은 선택된다', async () => {
    const { wrapper, scroller, tile } = await mount()
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    await scroller.trigger('touchmove', { touches: [touch(260)] })
    await scroller.trigger('touchend', { changedTouches: [touch(260)] })
    await tile(2).trigger('click')
    expect(wrapper.emitted('tile')).toBeUndefined()
    await new Promise(r => setTimeout(r, 450))
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    await scroller.trigger('touchend', { changedTouches: [touch(301)] })
    await tile(2).trigger('click')
    expect(wrapper.emitted('tile')).toHaveLength(1)
    wrapper.unmount()
  })

  it('드래그 후 400ms 안이라도 새 touchstart 로 시작한 탭은 선택된다', async () => {
    const { wrapper, scroller, tile } = await mount()
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    await scroller.trigger('touchmove', { touches: [touch(260)] })
    await scroller.trigger('touchend', { changedTouches: [touch(260)] })
    // 같은 제스처의 click(touchend 직후, 새 touchstart 전)은 막힌다.
    await tile(2).trigger('click')
    expect(wrapper.emitted('tile')).toBeUndefined()
    await new Promise(r => setTimeout(r, 200))
    await scroller.trigger('touchstart', { touches: [touch(300)] })
    await scroller.trigger('touchend', { changedTouches: [touch(301)] })
    await tile(2).trigger('click')
    expect(wrapper.emitted('tile')).toHaveLength(1)
    wrapper.unmount()
  })

  it('세로 위주 이동은 가로 보완을 시작하지 않는다', async () => {
    const { wrapper, scroller, el } = await mount()
    el.scrollLeft = 0
    await scroller.trigger('touchstart', { touches: [touch(300, 100)] })
    await scroller.trigger('touchmove', { touches: [touch(285, 160)] })
    await scroller.trigger('touchmove', { touches: [touch(270, 200)] })
    expect(el.scrollLeft).toBe(0)
    wrapper.unmount()
  })
})
