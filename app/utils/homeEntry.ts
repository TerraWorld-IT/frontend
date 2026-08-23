import type { LocationQuery } from 'vue-router'
import type { ManageTab } from '~/components/terrarium/ManagePanel.vue'

/**
 * 홈(`/`) 진입 쿼리 해석 — 다른 화면에서 관리 모드로 직행하는 딥링크 계약(아프젝 T13, 댓글 #53).
 *
 *   /?mode=manage             → 관리 모드(기본 탭 아이템 배치)
 *   /?mode=manage&tab=spirit  → 관리 모드 + 정령 탭 (키우기 30일 완료 카드 "관리 모드 바로가기")
 *   /?mode=manage&tab=spirits → 위와 동일(내부 탭 id)
 *
 * 순수 함수 — 홈은 스냅샷 로드 후 이 결과로 모드/탭을 정하고 쿼리를 지운다(router.replace).
 */

export interface HomeEntry {
  /** 진입할 모드 — 관리 모드만 지원, 그 외는 null */
  mode: 'manage' | null
  /** 관리 모드 탭 — mode 가 manage 일 때만 의미 있다. 미지정/미지원 값은 null(호출부가 기본 탭 적용) */
  tab: ManageTab | null
}

/** 외부 노출용 탭 별칭 → 내부 ManageTab. 단수/복수 둘 다 받는다. */
const TAB_ALIASES: Record<string, ManageTab> = {
  'item': 'items',
  'items': 'items',
  'spirit': 'spirits',
  'spirits': 'spirits',
  'background': 'backgrounds',
  'backgrounds': 'backgrounds',
}

function firstString(value: LocationQuery[string] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : null
}

export function parseHomeEntryQuery(query: LocationQuery): HomeEntry {
  const mode = firstString(query.mode)
  if (mode !== 'manage') return { mode: null, tab: null }
  const rawTab = firstString(query.tab)
  const tab = rawTab ? TAB_ALIASES[rawTab.toLowerCase()] ?? null : null
  return { mode: 'manage', tab }
}

/** 홈 진입 쿼리가 소비 대상(mode/tab)을 담고 있는지 — 소비 후 쿼리 정리 판단용 */
export function hasHomeEntryQuery(query: LocationQuery): boolean {
  return query.mode !== undefined || query.tab !== undefined
}

/** 진입 쿼리에서 mode/tab 만 제거한 나머지 쿼리 — router.replace 로 주소를 정리할 때 쓴다 */
export function stripHomeEntryQuery(query: LocationQuery): LocationQuery {
  const rest: LocationQuery = { ...query }
  delete rest.mode
  delete rest.tab
  return rest
}
