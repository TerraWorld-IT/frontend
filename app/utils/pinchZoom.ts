// 거리 비율만으로 배율을 계산한다. 겹친 포인터와 비정상 거리는 현재 배율을 유지한다.
export function calculatePinchScale(scale: number, previousDistance: number, distance: number): number {
  if (!Number.isFinite(previousDistance) || !Number.isFinite(distance) || previousDistance <= 0 || distance <= 0) return scale
  return Math.max(0.5, Math.min(2, scale * distance / previousDistance))
}
