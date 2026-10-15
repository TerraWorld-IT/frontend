/** 시간대가 명시된 시행 시각만 허용한다. 빈 값·오타는 광고 차단과 현행 문서 유지로 처리한다. */
export function isAdsPolicyEffective(effectiveAt: unknown, now = Date.now()): boolean {
  if (typeof effectiveAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(effectiveAt)) return false
  const timestamp = Date.parse(effectiveAt)
  // Date.parse가 2월 30일 등을 다음 달로 보정해 조기 시행하지 않게 실제 달력 날짜도 대조한다.
  const date = new Date(`${effectiveAt.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== effectiveAt.slice(0, 10)) return false
  return Number.isFinite(timestamp) && Number.isFinite(now) && now >= timestamp
}
