import { describe, it, expect } from 'vitest'
import type {
  PagedRecordResponse,
  CreateRecordResponse,
  StatisticsResponse,
  TerrariumResponse,
  PlacementRequest,
  PlacementItem,
  CurrencyResponse,
  UserMeResponse,
  ItemListResponse,
  ItemResponse,
  ExchangeResult,
  InviteResponse,
  InviteAcceptResponse,
} from '@terraworld-it/openapi-frontend'

/**
 * API Contract Tests
 *
 * Validate that the generated SDK types match what the frontend expects.
 * These are compile-time + runtime shape checks to catch spec drift.
 *
 * 낙서장 리팩토링(2026-07): 화폐 모델이 개별 필드(basicCoins/specialCoins/…토큰)에서
 * 정규화 balances[] 로, 레벨/경험치·구 ExchangeResponse 는 제거로 바뀜 — 본 계약 테스트도 갱신.
 */
describe('API contract: response shapes', () => {
  describe('Records API', () => {
    it('PagedRecordResponse has content array', () => {
      const mock: PagedRecordResponse = {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      }
      expect(mock.content).toBeInstanceOf(Array)
      expect(mock).toHaveProperty('totalElements')
    })

    it('CreateRecordResponse has record + reward + updatedCurrency(balances)', () => {
      const mock: CreateRecordResponse = {
        record: { id: 1, categoryId: 1, categoryName: '산책', recordedDate: '2026-04-11', createdAt: '2026-04-11T00:00:00Z' },
        reward: { basicCoins: 5, categoryTokens: 3 },
        updatedCurrency: { balances: [{ code: 'COIN', amount: 105 }, { code: 'DEW', amount: 13 }] },
      }
      expect(mock.record).toHaveProperty('id')
      expect(mock.reward).toHaveProperty('basicCoins')
      expect(mock.reward).toHaveProperty('categoryTokens')
      // 낙서장: reward 에 experienceGained(경험치) 없음 (레벨/EXP 제거)
      expect(mock.reward).not.toHaveProperty('experienceGained')
      expect(mock.updatedCurrency.balances).toBeInstanceOf(Array)
    })

    it('StatisticsResponse has byCategory array', () => {
      const mock: StatisticsResponse = {
        todayRecords: 3,
        thisWeekRecords: 12,
        totalRecords: 50,
        byCategory: [{ categoryId: 1, categoryName: '산책', count: 20 }],
      }
      expect(mock.byCategory).toBeInstanceOf(Array)
    })
  })

  describe('Terrarium API', () => {
    it('TerrariumResponse has placedItems + maxSlots', () => {
      const mock: TerrariumResponse = {
        terrariumId: 1,
        background: { id: 1, name: '기본', assetUrl: '🫧' },
        placedItems: [],
        maxSlots: 5,
      }
      expect(mock.placedItems).toBeInstanceOf(Array)
      expect(mock.maxSlots).toBe(5)
    })

    it('PlacementRequest uses placedItems (not placements)', () => {
      const mock: PlacementRequest = {
        placedItems: [{ itemId: 1, slotId: 0 }],
      }
      expect(mock).toHaveProperty('placedItems')
      // @ts-expect-error — 'placements' should NOT exist
      expect(mock).not.toHaveProperty('placements')
    })

    it('PlacementItem is slot-based (itemId + slotId only)', () => {
      const mock: PlacementItem = { itemId: 1, slotId: 2 }
      expect(mock).toHaveProperty('itemId')
      expect(mock).toHaveProperty('slotId')
      // @ts-expect-error — position fields should NOT exist in type
      expect(mock).not.toHaveProperty('posX')
    })
  })

  describe('Currency API (낙서장 7화폐 balances[])', () => {
    it('CurrencyResponse uses normalized balances[] (not per-field basicCoins)', () => {
      const mock: CurrencyResponse = {
        balances: [
          { code: 'COIN', amount: 100 },
          { code: 'RUBY', amount: 10 },
          { code: 'SPARKLE', amount: 5 },
          { code: 'DEW', amount: 3 },
        ],
      }
      expect(mock.balances).toBeInstanceOf(Array)
      expect(mock.balances[0]).toHaveProperty('code')
      expect(mock.balances[0]).toHaveProperty('amount')
      // 구 모델의 개별 필드는 제거됨
      expect(mock).not.toHaveProperty('basicCoins')
      expect(mock).not.toHaveProperty('walkTokens')
    })

    it('UserMeResponse.currency is CurrencyResponse(balances); no level/exp progress', () => {
      const mock: UserMeResponse = {
        userId: 'cld-abc123',
        email: 'test@test.com',
        nickname: 'tester',
        role: 'USER',
        currency: { balances: [{ code: 'COIN', amount: 100 }] },
        ownedItems: [],
      }
      expect(mock.currency).toHaveProperty('balances')
      // 레벨/경험치 제거 → progress 필드 없음
      expect(mock).not.toHaveProperty('progress')
    })
  })

  describe('Items API', () => {
    it('ItemListResponse wraps items in object', () => {
      const mock: ItemListResponse = { items: [] }
      expect(mock).toHaveProperty('items')
      expect(mock.items).toBeInstanceOf(Array)
    })

    it('ItemResponse has layout enum (FOREGROUND/BACKGROUND/FIGURE)', () => {
      const mock: ItemResponse = {
        id: 1,
        name: '작은 풀',
        priceType: 'BASIC',
        priceAmount: 10,
        rarity: 'COMMON',
        assetUrl: '🌿',
        layout: 'FOREGROUND',
        isAnimated: false,
      }
      expect(['FOREGROUND', 'BACKGROUND', 'FIGURE']).toContain(mock.layout)
    })
  })

  describe('Exchange API (낙서장 directed exchange)', () => {
    it('ExchangeResult has from/to + fromAmount/grossToAmount/feeAmount/toAmount', () => {
      const mock: ExchangeResult = {
        from: 'RUBY',
        to: 'COIN',
        fromAmount: 5,
        grossToAmount: 10,
        feeAmount: 0,
        toAmount: 10,
      }
      expect(mock).toHaveProperty('from')
      expect(mock).toHaveProperty('to')
      expect(mock).toHaveProperty('toAmount')
      // 구 필드(fromType/rate) 제거
      expect(mock).not.toHaveProperty('fromType')
    })
  })

  describe('Invite API', () => {
    it('InviteResponse has inviteCode + inviteLink', () => {
      const mock: InviteResponse = {
        inviteCode: 'ABC123',
        inviteLink: 'https://terraworld.dev/share/ABC123',
        expiresAt: '2026-04-18T00:00:00Z',
      }
      expect(mock).toHaveProperty('inviteCode')
      expect(mock).toHaveProperty('inviteLink')
    })

    it('InviteAcceptResponse has reward.specialCoins', () => {
      const mock: InviteAcceptResponse = {
        message: 'accepted',
        reward: { specialCoins: 5 },
      }
      expect(mock.reward).toHaveProperty('specialCoins')
    })
  })
})
