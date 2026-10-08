import { describe, it, expect } from 'vitest'
import { ADS_ENABLED, CATEGORY_COLORS, CATEGORY_ICONS, RARITY_LABELS, DEFAULTS } from '~/utils/constants'
import { isRewardedAdAvailable, resolveRewardedAdId } from '~/composables/useAdMob'

describe('constants', () => {
  describe('CATEGORY_COLORS', () => {
    it('defines colors for all 4 categories', () => {
      expect(CATEGORY_COLORS).toHaveProperty('산책')
      expect(CATEGORY_COLORS).toHaveProperty('독서')
      expect(CATEGORY_COLORS).toHaveProperty('러닝')
      expect(CATEGORY_COLORS).toHaveProperty('낙서')
    })

    it('each color is a valid hex string', () => {
      for (const color of Object.values(CATEGORY_COLORS)) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })
  })

  describe('CATEGORY_ICONS', () => {
    it('maps 4 categories to emojis', () => {
      expect(Object.keys(CATEGORY_ICONS)).toHaveLength(4)
    })
  })

  describe('RARITY_LABELS', () => {
    it('defines COMMON, RARE, EPIC with label and class', () => {
      for (const key of ['COMMON', 'RARE', 'EPIC']) {
        expect(RARITY_LABELS[key]).toHaveProperty('label')
        expect(RARITY_LABELS[key]).toHaveProperty('class')
      }
    })
  })

  describe('DEFAULTS', () => {
    it('has sensible default values', () => {
      expect(DEFAULTS.MAX_DAILY_RECORDS).toBeGreaterThan(0)
      expect(DEFAULTS.TOKEN_EXCHANGE_RATE).toBeGreaterThan(0)
      expect(DEFAULTS.PAGE_SIZE).toBeGreaterThan(0)
    })
  })

  describe('ADS_ENABLED', () => {
    it('광고 활성화 후에도 플러그인·운영 ID·네이티브 조건을 모두 만족해야 한다', () => {
      expect(ADS_ENABLED).toBe(true)
      expect(isRewardedAdAvailable(true, true, 'ios', resolveRewardedAdId('ios-real/1', true, 'ios'))).toBe(true)
      for (const platform of ['ios', 'android', 'web']) {
        expect(isRewardedAdAvailable(platform !== 'web', false, platform, 'real/1')).toBe(false)
      }
      expect(isRewardedAdAvailable(true, true, 'ios', resolveRewardedAdId('', true, 'ios'))).toBe(false)
      expect(isRewardedAdAvailable(false, true, 'ios', 'real/1')).toBe(false)
    })
  })
})
