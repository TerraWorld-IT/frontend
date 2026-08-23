import { describe, it, expect } from 'vitest'
import { addManualTodo, mergeRoutineTodos, sortTodos, TODO_LIMIT, type TodoItem } from '~/utils/todoList'

// 투두 시트 정렬 규칙 (Figma 댓글 #59/#60/#62, 계획 정렬 합의) — 수기(당일 직접 추가) 항목 맨 위 → 루틴 항목 그 아래 고정,
// 각 묶음 안은 최근 추가가 상단(recency). 이 규칙은 확정(accepted as-is)이며 테스트 이름이 그 규칙을 서술한다.
describe('todoList 정렬 — 수기 당일 항목 최상단 > 루틴 항목 > 묶음 내 최근 추가 순', () => {
  const routineA: TodoItem = { id: 'routine-1', text: '청소', checked: false, routineId: 1, addedAt: 100 }
  const routineB: TodoItem = { id: 'routine-2', text: '수영', checked: false, routineId: 2, addedAt: 200 }
  const manualOld: TodoItem = { id: 'todo-1', text: '타이레놀', checked: false, addedAt: 50 }
  const manualNew: TodoItem = { id: 'todo-2', text: '장보기', checked: false, addedAt: 300 }

  it('1차: 수기(당일) 항목이 루틴 항목보다 위 / 2차: 같은 묶음 안은 최근 추가(addedAt 큰 것)가 먼저', () => {
    const sorted = sortTodos([routineA, manualOld, routineB, manualNew])
    expect(sorted.map(t => t.id)).toEqual(['todo-2', 'todo-1', 'routine-2', 'routine-1'])
  })

  it('입력 배열을 변형하지 않는다', () => {
    const input = [routineA, manualOld]
    sortTodos(input)
    expect(input.map(t => t.id)).toEqual(['routine-1', 'todo-1'])
  })

  it('수기 추가(addManualTodo)는 같은 규칙으로 정렬된 배열을 돌려주고 빈 텍스트·상한 초과는 null', () => {
    const added = addManualTodo([routineA], '  독서  ', 999)
    expect(added?.map(t => t.text)).toEqual(['독서', '청소'])
    expect(addManualTodo([routineA], '   ')).toBeNull()

    const full: TodoItem[] = Array.from({ length: TODO_LIMIT }, (_, i) => ({ id: `t${i}`, text: `${i}`, checked: false, addedAt: i }))
    expect(addManualTodo(full, '초과')).toBeNull()
  })

  it('루틴 프리필(mergeRoutineTodos)은 중복 routineId 를 건너뛰고 상한까지만 채우며, 수기 항목 아래에 놓인다', () => {
    const merged = mergeRoutineTodos([routineA, manualNew], [{ id: 1, label: '청소' }, { id: 3, label: '피부과' }], 400)
    expect(merged.map(t => t.id)).toEqual(['todo-2', 'routine-3', 'routine-1'])

    const nearlyFull: TodoItem[] = Array.from({ length: TODO_LIMIT - 1 }, (_, i) => ({ id: `t${i}`, text: `${i}`, checked: false, addedAt: i }))
    const capped = mergeRoutineTodos(nearlyFull, [{ id: 7, label: 'a' }, { id: 8, label: 'b' }])
    expect(capped).toHaveLength(TODO_LIMIT)
    expect(capped.some(t => t.routineId === 7)).toBe(true)
    expect(capped.some(t => t.routineId === 8)).toBe(false)
  })
})
