import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ItemResponse } from '@terraworld-it/openapi-frontend'
import { isAssetUrl, useItemAsset } from '~/composables/useItemAsset'
import ItemsPage from '~/pages/admin/items.vue'

const mocks = vi.hoisted(() => ({
  sdk: {
    listAllItems: vi.fn().mockResolvedValue({ data: { items: [] } }),
    listCategories: vi.fn().mockResolvedValue({ data: { categories: [] } }),
    createItem: vi.fn().mockResolvedValue({ data: null }),
  },
}))
mockNuxtImport('useOpenApi', () => () => ({ sdk: mocks.sdk, client: {} }))
mockNuxtImport('useToast', () => () => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('~/stores/items', () => ({ useItemsStore: () => ({ invalidate: vi.fn() }) }))

describe('아이템 에셋 등록 폼', () => {
  it.each([false, true])('원본 요청에 선택 slug와 파일 애니메이션 여부를 전달한다 (입력=%s)', async (provided) => {
    mocks.sdk.createItem.mockClear()
    const wrapper = await mountSuspended(ItemsPage, {
      shallow: true, global: { renderStubDefaultSlot: true },
    })
    await flushPromises()
    const form = wrapper.get('form')
    await form.get('input[maxlength="100"]').setValue('식물')
    await form.get('input[maxlength="500"]').setValue('https://cdn.example/plant.gif')
    const slug = form.get('input[maxlength="50"]')
    expect(slug.attributes('required')).toBeUndefined()
    expect((slug.element as HTMLInputElement).value).toBe('')
    const animated = form.get('input[type="checkbox"]')
    expect((animated.element as HTMLInputElement).checked).toBe(false)
    if (provided) {
      await slug.setValue(' plant-1 ')
      await animated.setValue(true)
    }
    await form.trigger('submit')
    await flushPromises()
    expect(mocks.sdk.createItem).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      body: expect.objectContaining({
        name: '식물', assetUrl: 'https://cdn.example/plant.gif',
        slug: provided ? 'plant-1' : null, isAnimated: provided,
      }),
    }))
    wrapper.unmount()
  })
})

async function mountAssets() {
  let assets!: ReturnType<typeof useItemAsset>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      assets = useItemAsset()
      return () => h('div')
    },
  }))
  wrapper.unmount()
  return assets
}

describe('아이템 공용 이미지 규칙', () => {
  // 변경 전 상점/홈 배경의 실제 출력값을 고정해 순서가 뒤집히는 회귀를 잡는다.
  it.each([
    ['절대 URL', 'https://cdn.example/plant.gif', 'plant', 'FOREGROUND', true, 'https://cdn.example/plant.gif'],
    ['루트 URL', '/custom/plant.png', 'plant', 'FIGURE', false, '/custom/plant.png'],
    ['배경은 외부 URL보다 slug PNG 우선', 'https://dead.example/bg.gif', 'forest', 'BACKGROUND', true, '/items/forest.png'],
    ['배경은 루트 URL보다 slug PNG 우선', '/custom/bg.gif', 'forest', 'BACKGROUND', true, '/items/forest.png'],
    ['배경 null slug', 'https://dead.example/bg.png', null, 'BACKGROUND', false, '/items/placeholder.png'],
    ['일반 slug PNG', '🌵', 'plant-1', 'FOREGROUND', false, '/items/plant-1.png'],
    ['일반 slug GIF', '✨', 'spirit', 'FIGURE', true, '/items/spirit.gif'],
    ['URL은 null slug에도 보존', 'https://cdn.example/item.png', null, 'FOREGROUND', false, 'https://cdn.example/item.png'],
  ] as const)('%s: 리팩터 전후 URL 동일', async (_name, assetUrl, slug, layout, isAnimated, beforeUrl) => {
    const { resolveItemImage } = await mountAssets()
    expect(resolveItemImage({ assetUrl, slug, layout, isAnimated })).toBe(beforeUrl)
  })

  it.each([false, true])('일반 null slug는 깨진 /.png 또는 /.gif 대신 placeholder로 수정한다 (GIF=%s)', async (isAnimated) => {
    const { resolveItemImage, placeholderUrl } = await mountAssets()
    const item: Pick<ItemResponse, 'slug' | 'assetUrl' | 'layout' | 'isAnimated'> = {
      slug: null, assetUrl: '🌵', layout: 'FOREGROUND', isAnimated,
    }
    expect(resolveItemImage(item)).toBe('/items/placeholder.png')
    expect(resolveItemImage(item)).toBe(placeholderUrl)
    expect(resolveItemImage(item)).not.toBe(isAnimated ? '/items/.gif' : '/items/.png')
  })

  it.each([
    ['https://cdn.example/item.png', true], ['/items/item.png', true],
    ['🌵', false], ['plant-1.png', false], ['', false], [null, false], [undefined, false],
  ] as const)('기존 URL/이모지 분기 보존: %s', (value, expected) => {
    expect(isAssetUrl(value)).toBe(expected)
  })

  it('이미지 실패는 placeholder로 한 번만 전환하고 target 없는 이벤트도 허용한다', async () => {
    const { onAssetError } = await mountAssets()
    const img = document.createElement('img')
    img.src = '/missing.png'
    img.addEventListener('error', onAssetError)
    img.dispatchEvent(new Event('error'))
    expect(img.getAttribute('src')).toBe('/items/placeholder.png')
    const placeholder = img.src
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe(placeholder)
    expect(() => onAssetError(new Event('error'))).not.toThrow()
  })
})
