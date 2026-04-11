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
  ExchangeResponse,
  InviteResponse,
  InviteAcceptResponse,
} from '@terraworld-it/openapi-frontend'

/**
 * API Contract Tests
 *
 * Validate that the generated SDK types match what the frontend expects.
 * These are compile-time + runtime shape checks to catch spec drift.
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

    it('CreateRecordResponse has record + reward + updatedCurrency', () => {
      const mock: CreateRecordResponse = {
        record: { id: 1, categoryId: 1, categoryName: '산책', recordedDate: '2026-04-11', createdAt: '2026-04-11T00:00:00Z' },
        reward: { basicCoins: 5, categoryTokens: 3, experienceGained: 10 },
        updatedCurrency: { basicCoins: 105, specialCoins: 10, walkTokens: 13, readTokens: 0, runTokens: 0, drawTokens: 0 },
      }
      expect(mock.record).toHaveProperty('id')
      expect(mock.reward).toHaveProperty('basicCoins')
      expect(mock.updatedCurrency).toHaveProperty('basicCoins')
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

  describe('Currency API', () => {
    it('CurrencyResponse uses plural field names (basicCoins, not basicCoin)', () => {
      const mock: CurrencyResponse = {
        basicCoins: 100,
        specialCoins: 10,
        walkTokens: 5,
        readTokens: 3,
        runTokens: 2,
        drawTokens: 1,
      }
      expect(mock).toHaveProperty('basicCoins')
      expect(mock).not.toHaveProperty('basicCoin') // singular would be wrong
    })

    it('UserMeResponse.currency is CurrencyResponse', () => {
      const mock: UserMeResponse = {
        userId: 1,
        email: 'test@test.com',
        nickname: 'tester',
        currency: { basicCoins: 100, specialCoins: 10, walkTokens: 0, readTokens: 0, runTokens: 0, drawTokens: 0 },
        progress: { level: 1, experience: 0, experienceToNext: 100 },
        ownedItems: [],
        placedItems: [],
      }
      expect(mock.currency).toHaveProperty('basicCoins')
      expect(mock.currency).toHaveProperty('walkTokens')
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

  describe('Exchange API', () => {
    it('ExchangeResponse has exchanged + updatedCurrency', () => {
      const mock: ExchangeResponse = {
        exchanged: { fromType: 'SPECIAL_COIN', fromAmount: 5, toType: 'BASIC_COIN', toAmount: 10, rate: 2 },
        updatedCurrency: { basicCoins: 110, specialCoins: 5, walkTokens: 0, readTokens: 0, runTokens: 0, drawTokens: 0 },
      }
      expect(mock.exchanged).toHaveProperty('rate')
      expect(mock.updatedCurrency).toHaveProperty('basicCoins')
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
