import type { CurrencyResponse } from '@terraworld-it/openapi-frontend'

/**
 * 화폐 표시 유틸 — 낙서장 리팩토링 req 1(7화폐 표시). BE CurrencyCode / GET /currencies 와 정합.
 * CurrencyResponse 가 balances[] 로 정규화되어, 개별 필드 대신 balanceOf(code) 로 조회한다.
 */

/** 7종 고정 화폐 코드 (BE `CurrencyCode` 상수와 동일). */
export type CurrencyCode = 'COIN' | 'RUBY' | 'SPARKLE' | 'DEW' | 'SUN' | 'BOLT' | 'WIND'

export interface CurrencyMeta {
  code: CurrencyCode
  labelKo: string
  icon: string // lucide 아이콘 (프로토타입 CurrencyIcons 대응)
}

/** 표시 메타 (정적 fallback — GET /currencies 미호출 시). 순서 = 표시 순서. */
export const CURRENCY_META: CurrencyMeta[] = [
  { code: 'COIN', labelKo: '코인', icon: 'lucide:circle-dollar-sign' },
  { code: 'RUBY', labelKo: '루비', icon: 'lucide:gem' },
  { code: 'SPARKLE', labelKo: '반짝이', icon: 'lucide:sparkles' },
  { code: 'DEW', labelKo: '이슬', icon: 'lucide:footprints' },
  { code: 'SUN', labelKo: '햇살', icon: 'lucide:book-open' },
  { code: 'BOLT', labelKo: '번개', icon: 'lucide:zap' },
  { code: 'WIND', labelKo: '바람', icon: 'lucide:palette' },
]

/** balances[] 에서 특정 화폐 잔액 조회 (없으면 0). */
export function balanceOf(
  currency: CurrencyResponse | null | undefined,
  code: CurrencyCode,
): number {
  if (!currency?.balances) return 0
  return currency.balances.find(b => b.code === code)?.amount ?? 0
}

/** balances[] 의 특정 화폐 잔액을 갱신(없으면 추가). 로컬 ref mutation 용. */
export function setBalance(
  currency: CurrencyResponse | null | undefined,
  code: CurrencyCode,
  amount: number,
): void {
  if (!currency?.balances) return
  const entry = currency.balances.find(b => b.code === code)
  if (entry) entry.amount = amount
  else currency.balances.push({ code, amount })
}
