import { describe, it, expect } from 'vitest'
import { CATEGORY_COLORS, CATEGORY_ICONS, RARITY_LABELS, DEFAULTS } from '~/utils/constants'

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
})
