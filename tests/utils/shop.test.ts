import { describe, it, expect } from 'vitest'
import type { ItemResponse } from '@terraworld-it/openapi-frontend'
import { sortOwnedLast, tokenCodeForItem, priceParts, isPurchasable } from '~/utils/shop'

function item(over: Partial<ItemResponse> & { id: number }): ItemResponse {
  return {
    name: `item-${over.id}`,
    slug: `slug-${over.id}`,
    priceType: 'BASIC',
    priceAmount: 10,
    rarity: 'COMMON',
    assetUrl: '/items/x.png',
    layout: 'FOREGROUND',
    isAnimated: false,
    isActive: true,
    purchasable: true,
    ...over,
  }
}

describe('utils/shop', () => {
  describe('sortOwnedLast (Figma 댓글 #57 — 보유중 카드 뒤로)', () => {
    it('보유 항목을 뒤로 보내되 그룹 내부 순서는 유지한다', () => {
      const list = [item({ id: 1 }), item({ id: 2 }), item({ id: 3 }), item({ id: 4 })]
      const owned = new Set(['slug-1', 'slug-3'])
      const sorted = sortOwnedLast(list, it => owned.has(it.slug ?? ''))
      expect(sorted.map(i => i.id)).toEqual([2, 4, 1, 3])
    })

    it('보유 항목이 없으면 원본 순서 그대로', () => {
      const list = [item({ id: 5 }), item({ id: 6 })]
      expect(sortOwnedLast(list, () => false).map(i => i.id)).toEqual([5, 6])
    })

    it('원본 배열을 변경하지 않는다', () => {
      const list = [item({ id: 1 }), item({ id: 2 })]
      sortOwnedLast(list, it => it.id === 1)
      expect(list.map(i => i.id)).toEqual([1, 2])
    })
  })

  describe('tokenCodeForItem / priceParts (S5 토큰 종류 + 수량 표기)', () => {
    it('BASIC→코인, SPECIAL→루비', () => {
      expect(tokenCodeForItem({ priceType: 'BASIC', categoryName: null })).toBe('COIN')
      expect(tokenCodeForItem({ priceType: 'SPECIAL', categoryName: '산책' })).toBe('RUBY')
    })

    it('TOKEN 은 카테고리명으로 활동 토큰 매핑 (산책→이슬/독서→햇살/러닝→번개/낙서→바람)', () => {
      expect(tokenCodeForItem({ priceType: 'TOKEN', categoryName: '산책' })).toBe('DEW')
      expect(tokenCodeForItem({ priceType: 'TOKEN', categoryName: '독서' })).toBe('SUN')
      expect(tokenCodeForItem({ priceType: 'TOKEN', categoryName: '러닝' })).toBe('BOLT')
      expect(tokenCodeForItem({ priceType: 'TOKEN', categoryName: '낙서' })).toBe('WIND')
      expect(tokenCodeForItem({ priceType: 'TOKEN', categoryName: '커스텀' })).toBeNull()
    })

    it('priceParts — "이슬토큰 25" 형식 재료, MIXED 는 코인 + 토큰 2줄', () => {
      expect(priceParts({ priceType: 'TOKEN', categoryName: '산책', priceAmount: 25, tokenPrice: null }))
        .toEqual([{ code: 'DEW', label: '이슬토큰', amount: 25 }])
      expect(priceParts({ priceType: 'MIXED', categoryName: '독서', priceAmount: 30, tokenPrice: 5 }))
        .toEqual([
          { code: 'COIN', label: '코인', amount: 30 },
          { code: 'SUN', label: '햇살토큰', amount: 5 },
        ])
    })
  })

  it('isPurchasable — 서버 purchasable 그대로 (정령 등 비판매 = false)', () => {
    expect(isPurchasable(item({ id: 1 }))).toBe(true)
    expect(isPurchasable(item({ id: 2, purchasable: false }))).toBe(false)
  })
})
