// 거리 비율만으로 배율을 계산한다. 겹친 포인터와 비정상 거리는 현재 배율을 유지한다.
export function calculatePinchScale(scale: number, previousDistance: number, distance: number): number {
  if (!Number.isFinite(previousDistance) || !Number.isFinite(distance) || previousDistance <= 0 || distance <= 0) return scale
  return Math.max(0.5, Math.min(2, scale * distance / previousDistance))
}

interface Point { x: number; y: number }

// 중점은 transform 원점 기준 화면 px이다. 배율(stageFit 포함) 비율만 적용하므로
// 병의 설계 좌표와 무관하게 이전 중점 아래의 콘텐츠가 다음 중점 아래에 남는다.
export function calculatePinchOffset(scale: number, nextScale: number, offset: Point, previousFocal: Point, nextFocal: Point): Point {
  if (!Number.isFinite(scale) || !Number.isFinite(nextScale) || scale <= 0 || nextScale <= 0) return offset
  const ratio = nextScale / scale
  return {
    x: nextFocal.x - (previousFocal.x - offset.x) * ratio,
    y: nextFocal.y - (previousFocal.y - offset.y) * ratio,
  }
}
