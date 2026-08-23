/**
 * 투두리스트 항목 정렬/추가 규칙 (Figma 댓글 #59/#60/#62 — 기록 탭 투두 시트).
 *
 * - 당일 추가(수기) 항목은 맨 위에 고정된다 (#59).
 * - 루틴에서 프리필된 항목은 수기 항목 아래에 묶여 상단에 고정된다 (#60).
 * - 각 묶음 안에서는 최근 추가한 항목이 위로 온다 (#62).
 *
 * 순수 함수만 둔다 — 시트(RecordTodoSheet)와 단위 테스트가 같은 규칙을 공유한다.
 */
export interface TodoItem {
  id: string
  text: string
  checked: boolean
  /** 루틴 프리필 출처. 수기 항목은 undefined. */
  routineId?: number
  /** 추가 시각(ms) — 묶음 내 최근 추가 상단 정렬 키 */
  addedAt: number
}

/** 시트 한 번에 담을 수 있는 항목 상한 (Figma "새 항목 추가 (최대 30개)") */
export const TODO_LIMIT = 30

export function isRoutineTodo(item: TodoItem): boolean {
  return item.routineId !== undefined
}

/** 규칙대로 정렬한 새 배열을 돌려준다 (입력 불변). */
export function sortTodos(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
    const ra = isRoutineTodo(a) ? 1 : 0
    const rb = isRoutineTodo(b) ? 1 : 0
    if (ra !== rb) return ra - rb // 수기(0) 먼저, 루틴(1) 다음
    return b.addedAt - a.addedAt // 최근 추가 상단
  })
}

/**
 * 수기 항목 추가. 상한 초과·빈 텍스트면 null 을 돌려준다 (호출부가 안내 표시).
 * 반환 배열은 정렬까지 끝난 새 배열이다.
 */
export function addManualTodo(items: TodoItem[], text: string, now: number = Date.now()): TodoItem[] | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (items.length >= TODO_LIMIT) return null
  return sortTodos([...items, { id: `todo-${now}-${items.length}`, text: trimmed, checked: false, addedAt: now }])
}

/**
 * 루틴 프리필 — 이미 들어온 routineId 는 건너뛰고(시트 재열기 중복 방지), 상한까지만 채운다.
 * 기존 항목을 먼저 보존하고 초과분 프리필만 잘린다.
 */
export function mergeRoutineTodos(
  items: TodoItem[],
  routines: { id: number; label: string }[],
  now: number = Date.now(),
): TodoItem[] {
  const existing = new Set(items.filter(isRoutineTodo).map(t => t.routineId))
  const room = Math.max(0, TODO_LIMIT - items.length)
  const added = routines
    .filter(r => !existing.has(r.id))
    .slice(0, room)
    .map((r, i) => ({ id: `routine-${r.id}`, text: r.label, checked: false, routineId: r.id, addedAt: now + i }))
  if (added.length === 0) return items
  return sortTodos([...items, ...added])
}
