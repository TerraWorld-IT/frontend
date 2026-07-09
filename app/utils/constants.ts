import type { RecordResponse } from '@terraworld-it/openapi-frontend'

/** 카테고리 아이콘 맵 (이모지 → 추후 @iconify 전환 가능) */
export const CATEGORY_ICONS: Record<string, string> = {
  산책: '🚶',
  독서: '📖',
  러닝: '🏃',
  낙서: '🎨',
}

/** 카테고리 컬러 맵 */
export const CATEGORY_COLORS: Record<string, string> = {
  산책: '#00A95C',
  독서: '#0078BF',
  러닝: '#E3505F',
  낙서: '#FF6C2F',
}

/** 카테고리 배경색 맵 (Tailwind class) */
export const CATEGORY_BG: Record<string, string> = {
  산책: 'bg-green-50',
  독서: 'bg-blue-50',
  러닝: 'bg-red-50',
  낙서: 'bg-orange-50',
}

/**
 * dailyType 표시 라벨/아이콘 맵 — RecordResponse.dailyType(PHOTO/DIARY/FOCUS/DISTANCE) 전용.
 * dailyType 이 있는 기록은 보상 토큰 라우팅을 위해 categoryId/categoryName 이 canonical
 * 시스템 카테고리(예: DIARY→독서)로 강제 매핑돼 있어, categoryName 을 그대로 표시하면 실제
 * 기록 종류와 다르게 보인다("일기"가 "독서"로 표시되는 등) — 화면에는 이 맵을 우선 사용.
 * PHOTO 는 기록하기 화면상 "투두리스트" 기능명으로 노출(레거시 dailyType 이름 유지, UI만 갱신).
 *
 * Architecture/Codex 감사 지적: 기존 Record<string,string> 은 openapi의 dailyType enum이
 * 늘어나도 typecheck가 누락을 못 잡아 canonical categoryName으로 조용히 회귀할 수 있었음.
 * NonNullable<RecordResponse['dailyType']> 기반으로 좁혀 컴파일 타임에 소진 검사되도록 함.
 */
type DailyType = NonNullable<RecordResponse['dailyType']>

export const DAILY_TYPE_LABELS: Record<DailyType, string> = {
  PHOTO: '투두리스트',
  DIARY: '일기',
  FOCUS: '집중',
  DISTANCE: '거리',
}

export const DAILY_TYPE_ICONS: Record<DailyType, string> = {
  PHOTO: '✅',
  DIARY: '📔',
  FOCUS: '⏱️',
  DISTANCE: '🏃',
}

/**
 * 기록 카드/캘린더 등 여러 화면에서 반복 구현되던 "dailyType 있으면 그 라벨/아이콘 우선,
 * 없으면 categoryName/categoryEmoji" 표시 규칙을 단일 헬퍼로 고정(Architecture/Codex
 * 감사 지적 — RecordCard.vue computed / calendar/index.vue 인라인 표현식으로 중복 구현됨).
 */
export function recordDisplayLabel(record: Pick<RecordResponse, 'dailyType' | 'categoryName'>): string {
  return (record.dailyType && DAILY_TYPE_LABELS[record.dailyType]) || record.categoryName
}

export function recordDisplayIcon(record: Pick<RecordResponse, 'dailyType' | 'categoryEmoji'>): string {
  return (record.dailyType && DAILY_TYPE_ICONS[record.dailyType]) || record.categoryEmoji || '🏷️'
}

/** 희귀도 라벨 */
export const RARITY_LABELS: Record<string, { label: string; class: string }> = {
  COMMON: { label: '일반', class: 'bg-gray-100 text-gray-500' },
  RARE: { label: '레어', class: 'bg-blue-100 text-blue-600' },
  EPIC: { label: '에픽', class: 'bg-purple-100 text-purple-600' },
}

/** 재화 타입 라벨 */
export const CURRENCY_LABELS: Record<string, string> = {
  BASIC_COIN: '🪙 코인',
  CATEGORY_TOKEN: '토큰',
}

/** 앱 기본값 */
export const DEFAULTS = {
  MAX_DAILY_RECORDS: 5,
  TOKEN_EXCHANGE_RATE: 2,
  PAGE_SIZE: 20,
} as const

/** localStorage 키 (일관된 네이밍) */
export const STORAGE_KEYS = {
  ONBOARDING_DONE: 'tw-onboarding-done',
  LAYOUT_VARIANT: 'tw-layout',
  PUSH_TOKEN: 'tw-push-token',
  THEME: 'tw-theme',
} as const
