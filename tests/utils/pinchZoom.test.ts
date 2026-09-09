import { describe, expect, it } from 'vitest'
import { calculatePinchScale } from '~/utils/pinchZoom'

describe('calculatePinchScale', () => {
  it('A-03 거리 비율에 따라 확대·축소하며 기존 한계와 겹친 포인터를 처리한다', () => {
    expect(calculatePinchScale(1, 100, 150)).toBe(1.5)
    expect(calculatePinchScale(1.5, 150, 100)).toBe(1)
    expect(calculatePinchScale(1, 100, 1000)).toBe(2)
    expect(calculatePinchScale(1, 100, 1)).toBe(0.5)
    expect(calculatePinchScale(1.2, 0, 100)).toBe(1.2)
    expect(calculatePinchScale(1.2, 100, 0)).toBe(1.2)
    expect(calculatePinchScale(1.2, Number.NaN, 100)).toBe(1.2)
  })
})
