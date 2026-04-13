import { describe, it, expect } from 'vitest'
import { formatDateDot, formatNumber, formatCompact, formatRelative } from '~/utils/format'

describe('format utils', () => {
  describe('formatDateDot', () => {
    it('formats ISO date string to YYYY.MM.DD', () => {
      const result = formatDateDot('2026-04-11T09:30:00.000Z')
      expect(result).toMatch(/^2026\.04\.1[01]$/) // timezone-dependent
    })

    it('formats Date object', () => {
      const result = formatDateDot(new Date(2026, 3, 11)) // April = 3
      expect(result).toBe('2026.04.11')
    })
  })

  describe('formatNumber', () => {
    it('formats large numbers with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('formatCompact', () => {
    it('returns raw number below 1000', () => {
      expect(formatCompact(500)).toBe('500')
    })

    it('formats thousands as K', () => {
      expect(formatCompact(1500)).toBe('1.5K')
    })

    it('formats millions as M', () => {
      expect(formatCompact(2500000)).toBe('2.5M')
    })
  })

  describe('formatRelative', () => {
    it('returns 방금 전 for very recent dates', () => {
      const result = formatRelative(new Date())
      expect(result).toBe('방금 전')
    })

    it('returns N분 전 for minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      const result = formatRelative(fiveMinAgo)
      expect(result).toMatch(/\d+분 전/)
    })

    it('returns N시간 전 for hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      const result = formatRelative(threeHoursAgo)
      expect(result).toMatch(/\d+시간 전/)
    })

    it('returns N일 전 for days ago', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const result = formatRelative(twoDaysAgo)
      expect(result).toMatch(/\d+일 전/)
    })
  })
})
