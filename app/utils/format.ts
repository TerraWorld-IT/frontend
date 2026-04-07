import dayjs from 'dayjs'
import 'dayjs/locale/ko'

dayjs.locale('ko')

/** 날짜 포맷: 4월 7일 월요일 */
export function formatDateKo(date: string | Date): string {
  return dayjs(date).format('M월 D일 dddd')
}

/** 날짜 포맷: 2026.04.07 */
export function formatDateDot(date: string | Date): string {
  return dayjs(date).format('YYYY.MM.DD')
}

/** 날짜 포맷: 2026-04-07 (API용) */
export function formatDateApi(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

/** 상대 시간: 3분 전, 2시간 전 */
export function formatRelative(date: string | Date): string {
  const diff = dayjs().diff(dayjs(date), 'minute')
  if (diff < 1) return '방금 전'
  if (diff < 60) return `${diff}분 전`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

/** 숫자 포맷: 1,234 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

/** 짧은 숫자: 1.2K, 3.4M */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/** 오늘 날짜 (API용) */
export function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

/** 이번 달 (YYYY-MM) */
export function currentMonth(): string {
  return dayjs().format('YYYY-MM')
}
