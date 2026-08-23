import type { ItemResponse } from '@terraworld-it/openapi-frontend'
import type { CurrencyCode } from '~/utils/currency'

/**
 * 상점 표시 유틸 — 아프젝 v2 Figma(2026-08-21) S3b/S5 정합.
 *
 * - 가격은 "이슬토큰 25" 처럼 **토큰 종류 + 수량** 으로 표기한다(priceType TOKEN/MIXED 는
 *   아이템 카테고리명으로 활동 토큰 종류를 매핑 — 산책→이슬 / 독서→햇살 / 러닝→번개 / 낙서→바람).
 * - 보유중 카드는 목록 뒤로 정렬한다(Figma 댓글 #57).
 */

// TODO(N-B9 스펙 머지 후): SDK ItemResponse 가 purchasable 을 직접 제공하면 이 확장 타입을 제거한다.
export type ShopItem = ItemResponse & {
  /** 상점 판매 가능 여부(정령 아이템 등 비판매 = false). 기본 true. */
  purchasable?: boolean
}

/** 카테고리명 → 활동 토큰 코드 (BE 시스템 카테고리 4종 고정) */
export const CATEGORY_TOKEN_CODE: Record<string, CurrencyCode> = {
  산책: 'DEW',
  독서: 'SUN',
  러닝: 'BOLT',
  낙서: 'WIND',
}

/** 재화 코드 → 상점 가격 라벨용 이름 */
export const PRICE_CURRENCY_LABEL: Record<CurrencyCode, string> = {
  COIN: '코인',
  RUBY: '루비',
  SPARKLE: '반짝이',
  DEW: '이슬토큰',
  SUN: '햇살토큰',
  BOLT: '번개토큰',
  WIND: '바람토큰',
}

/**
 * 아이템의 주 결제 재화 코드.
 * BASIC→COIN, SPECIAL→RUBY, TOKEN→카테고리 토큰, MIXED→카테고리 토큰(보조 토큰분 기준).
 * 카테고리명을 모르는 TOKEN/MIXED 는 null(토큰 종류 미상 — 서버 검증 위임).
 */
export function tokenCodeForItem(item: Pick<ItemResponse, 'priceType' | 'categoryName'>): CurrencyCode | null {
  if (item.priceType === 'BASIC') return 'COIN'
  if (item.priceType === 'SPECIAL') return 'RUBY'
  const name = (item.categoryName ?? '').trim()
  return CATEGORY_TOKEN_CODE[name] ?? null
}

/** 가격 표기 목록 — 카드에는 [{code,label,amount}] 를 순서대로 그린다(MIXED 는 2줄). */
export interface PricePart {
  code: CurrencyCode | null
  label: string
  amount: number
}

export function priceParts(item: Pick<ItemResponse, 'priceType' | 'categoryName' | 'priceAmount' | 'tokenPrice'>): PricePart[] {
  const tokenCode = tokenCodeForItem(item)
  const tokenLabel = tokenCode ? PRICE_CURRENCY_LABEL[tokenCode] : '토큰'
  if (item.priceType === 'MIXED') {
    return [
      { code: 'COIN', label: PRICE_CURRENCY_LABEL.COIN, amount: item.priceAmount },
      { code: tokenCode, label: tokenLabel, amount: item.tokenPrice ?? 0 },
    ]
  }
  if (item.priceType === 'TOKEN') return [{ code: tokenCode, label: tokenLabel, amount: item.priceAmount }]
  if (item.priceType === 'SPECIAL') return [{ code: 'RUBY', label: PRICE_CURRENCY_LABEL.RUBY, amount: item.priceAmount }]
  return [{ code: 'COIN', label: PRICE_CURRENCY_LABEL.COIN, amount: item.priceAmount }]
}

/** 상점 노출 여부 — purchasable 미제공(현행 SDK)은 true 로 본다. */
export function isPurchasable(item: ShopItem): boolean {
  return item.purchasable !== false
}

/**
 * 보유중 카드를 목록 뒤로 보내는 안정 정렬(Figma 댓글 #57).
 * 미보유 항목끼리·보유 항목끼리의 원래 순서는 유지한다.
 */
export function sortOwnedLast<T>(items: readonly T[], isOwned: (item: T) => boolean): T[] {
  const notOwned: T[] = []
  const owned: T[] = []
  for (const it of items) (isOwned(it) ? owned : notOwned).push(it)
  return [...notOwned, ...owned]
}
