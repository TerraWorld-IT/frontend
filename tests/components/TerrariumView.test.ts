import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { TerrariumResponse } from '@terraworld-it/openapi-frontend'
import TerrariumView from '~/components/friends/TerrariumView.vue'

function terrarium(itemImage: string, free: boolean): TerrariumResponse {
  return {
    terrariumId: 1, tier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', maxSlots: 6,
    background: { id: 1, name: '기본 배경', assetUrl: '🌳' },
    placedItems: [{
      id: 1, itemId: 10, itemSlug: 'plant-1', itemImage, itemName: '식물',
      itemLayout: 'FOREGROUND', isAnimated: false, slotId: 0,
    }],
    ...(free ? { freePlacements: [{
      placementId: 1, itemId: 10, itemImage, itemName: '식물', itemLayout: 'FOREGROUND',
      posX: 0.5, posY: 0.5, scale: 1, flipped: false, zIndex: 0, isFreePlacement: true,
    }] } : {}),
  }
}

describe('친구 배치 이미지 fallback과 이모지 보존', () => {
  it.each([false, true])('실제 img error → placeholder, 반복 실패는 루프 없음 (자유배치=%s)', async (free) => {
    const wrapper = await mountSuspended(TerrariumView, {
      props: { terrarium: terrarium('https://cdn.example/missing.png', free) },
      shallow: true,
    })
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://cdn.example/missing.png')
    await img.trigger('error')
    expect(img.attributes('src')).toBe('/items/placeholder.png')
    await img.trigger('error')
    expect(img.attributes('src')).toBe('/items/placeholder.png')
    wrapper.unmount()
  })

  it.each([false, true])('slug가 있어도 이모지는 텍스트로 유지한다 (자유배치=%s)', async (free) => {
    const wrapper = await mountSuspended(TerrariumView, {
      props: { terrarium: terrarium('🌵', free) }, shallow: true,
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('🌵')
    wrapper.unmount()
  })
})
