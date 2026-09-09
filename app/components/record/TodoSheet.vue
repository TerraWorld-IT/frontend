<template>
  <!-- 투두리스트 시트 (R1b, Figma 393×620 고정) — 세그먼트 [리스트 메뉴][루틴 설정].
       목록은 최대 30개라 스크롤되므로 주 CTA(기록 완료 / 루틴 설정 완료)는 footer 슬롯에 고정한다. -->
  <CommonBottomSheet :open="open" ariaLabel="투두리스트 기록" fixed-height @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-2 px-5 py-3 border-b border-apjek-border shrink-0 mr-9">
        <span class="text-[18px]">💧</span>
        <span class="font-bold text-[16px] text-apjek-text">투두리스트 기록</span>
      </div>
      <!-- 세그먼트 — 선택=검정 채움 -->
      <div class="px-5 pt-3 pb-2 shrink-0">
        <div class="flex gap-[8px] rounded-full bg-apjek-bg p-[4px]">
          <button
            type="button"
            class="relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] flex-1 h-[36px] rounded-full text-[13px] font-semibold transition-all"
            :class="segment === 'list' ? 'bg-apjek-cta text-white' : 'text-apjek-text-sub'"
            :aria-pressed="segment === 'list'"
            :disabled="submitting"
            @click="switchSegment('list')"
          >
            리스트 메뉴
          </button>
          <button
            type="button"
            class="relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] flex-1 h-[36px] rounded-full text-[13px] font-semibold transition-all"
            :class="segment === 'routine' ? 'bg-apjek-cta text-white' : 'text-apjek-text-sub'"
            :aria-pressed="segment === 'routine'"
            :disabled="submitting"
            @click="switchSegment('routine')"
          >
            루틴 설정
          </button>
        </div>
      </div>
    </template>

    <!-- ═══ 리스트 메뉴 ═══ -->
    <div v-if="segment === 'list'" class="px-5 pb-2 flex flex-col gap-[8px]">
      <!-- 새 항목 추가 행 (연파랑) — 상한이면 빨강 ⊖ 안내 -->
      <div
        v-if="todos.length < TODO_LIMIT"
        class="flex items-center gap-[10px] rounded-[12px] px-[12px] h-[48px] bg-apjek-blue-soft"
      >
        <input
          v-model="newText"
          :disabled="submitting"
          :placeholder="`새 항목 추가 (최대 ${TODO_LIMIT}개)`"
          maxlength="50"
          class="flex-1 min-w-0 h-11 bg-transparent text-[14px] text-apjek-text outline-none focus-visible:ring-2 focus-visible:ring-apjek-blue/30 placeholder:text-apjek-blue-deep"
          @keydown.enter="!$event.isComposing && ($event.preventDefault(), onAdd())"
        >
        <button
          type="button"
          class="relative after:absolute after:-inset-2 after:content-[''] size-[28px] rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-95 bg-apjek-blue disabled:opacity-40"
          aria-label="항목 추가"
          :disabled="submitting || newText.trim().length === 0"
          @click="onAdd"
        >
          <Icon name="lucide:plus" class="w-4 h-4" />
        </button>
      </div>
      <div v-else class="flex items-center gap-[10px] rounded-[12px] px-[12px] h-[48px] bg-apjek-blue-soft">
        <span class="size-[28px] rounded-full flex items-center justify-center text-white shrink-0 bg-riso-poppy">
          <Icon name="lucide:minus" class="w-4 h-4" />
        </span>
        <span class="text-[13px] text-riso-poppy font-semibold">더 이상 항목을 추가할 수 없습니다</span>
      </div>

      <!-- 항목 행 — 원형 체크 + 텍스트 + 우측 빨강 휴지통. 체크는 즉시 반영 -->
      <div
        v-for="todo in todos"
        :key="todo.id"
        class="flex items-center gap-[12px] rounded-[12px] px-[12px] h-[48px] bg-apjek-bg"
      >
        <button
          type="button"
          class="relative after:absolute after:-inset-[11px] after:content-[''] size-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
          :class="todo.checked ? 'border-apjek-blue bg-apjek-blue' : 'border-apjek-border-strong bg-transparent'"
          :aria-pressed="todo.checked"
          :aria-label="`${todo.text} 체크`"
          :disabled="submitting"
          @click="toggleTodo(todo.id)"
        >
          <Icon v-if="todo.checked" name="lucide:check" class="w-3.5 h-3.5 text-white" />
        </button>
        <span
          class="flex-1 min-w-0 truncate text-[14px]"
          :class="todo.checked ? 'text-apjek-text-faint line-through' : 'text-apjek-text'"
        >
          {{ todo.text }}
        </span>
        <span v-if="todo.routineId !== undefined" class="text-[10px] text-apjek-text-faint shrink-0">루틴</span>
        <button
          type="button"
          class="relative after:absolute after:-inset-2 after:content-[''] size-[28px] rounded-full flex items-center justify-center shrink-0 transition active:scale-95"
          aria-label="항목 삭제"
          :disabled="submitting"
          @click="removeTodo(todo.id)"
        >
          <Icon name="lucide:trash-2" class="w-4 h-4 text-riso-poppy" />
        </button>
      </div>

    </div>

    <!-- ═══ 루틴 설정 ═══ -->
    <div v-else class="px-5 pb-2 flex flex-col gap-[10px]">
      <!-- 루틴 추가 — 접힌 행(연파랑) → 펼치면 반복 토글 + 요일 칩 + 이름 입력 -->
      <div v-if="routines.length >= ROUTINE_LIMIT_FE" class="flex items-center gap-[10px] rounded-[12px] px-[12px] h-[48px] bg-apjek-blue-soft">
        <span class="size-[28px] rounded-full flex items-center justify-center text-white shrink-0 bg-riso-poppy">
          <Icon name="lucide:minus" class="w-4 h-4" />
        </span>
        <span class="text-[13px] text-riso-poppy font-semibold">더 이상 항목을 추가할 수 없습니다</span>
      </div>
      <button
        v-else-if="!routineFormOpen"
        type="button"
        class="flex items-center gap-[10px] rounded-[12px] px-[12px] h-[48px] bg-apjek-blue-soft w-full text-left transition active:scale-[0.99]"
        :aria-expanded="routineFormOpen"
        @click="routineFormOpen = true"
      >
        <span class="size-[28px] rounded-full flex items-center justify-center text-white shrink-0 bg-apjek-blue">
          <Icon name="lucide:plus" class="w-4 h-4" />
        </span>
        <span class="text-[14px] text-apjek-blue-deep font-semibold">루틴 추가하기 (최대 {{ ROUTINE_LIMIT_FE }}개)</span>
      </button>
      <div v-else class="rounded-[12px] bg-apjek-blue-soft p-[12px] flex flex-col gap-[10px]">
        <div class="flex items-center justify-between">
          <span class="text-[14px] text-apjek-blue-deep font-semibold">루틴 추가하기 (최대 {{ ROUTINE_LIMIT_FE }}개)</span>
          <button
            type="button"
            class="relative after:absolute after:-inset-[10px] after:content-[''] size-[24px] rounded-full bg-apjek-surface flex items-center justify-center transition active:scale-95"
            aria-label="루틴 추가 닫기"
            @click="closeRoutineForm"
          >
            <Icon name="lucide:x" class="w-3.5 h-3.5 text-apjek-text-sub" />
          </button>
        </div>

        <!-- 반복 토글 — 매일=요일 전체 자동 선택 (댓글 #64) -->
        <div class="flex gap-[8px]">
          <button
            type="button"
            class="relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] flex-1 h-[36px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.97]"
            :class="repeatType === 'DAILY' ? 'bg-apjek-blue text-white' : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
            @click="setRepeat('DAILY')"
          >
            매일 반복
          </button>
          <button
            type="button"
            class="relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] flex-1 h-[36px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.97]"
            :class="repeatType === 'WEEKLY' ? 'bg-apjek-blue text-white' : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
            @click="setRepeat('WEEKLY')"
          >
            요일 지정
          </button>
        </div>

        <!-- 요일 칩 월~일 — 값은 스키마 규약 0=일~6=토 (JS getDay 와 동일) -->
        <div class="flex justify-between">
          <button
            v-for="d in WEEKDAYS"
            :key="d.value"
            type="button"
            class="relative after:absolute after:-inset-[5px] after:content-[''] size-[34px] rounded-full text-[12px] font-semibold transition-all active:scale-95 disabled:cursor-default"
            :class="selectedDays.includes(d.value)
              ? 'bg-apjek-blue text-white'
              : 'bg-apjek-surface text-apjek-text-sub border border-apjek-border-strong'"
            :aria-pressed="selectedDays.includes(d.value)"
            :disabled="repeatType === 'DAILY'"
            @click="toggleDay(d.value)"
          >
            {{ d.label }}
          </button>
        </div>

        <!-- 이름 입력 + ⊕ (이름 전 비활성 — 댓글 #61) -->
        <div class="flex items-center gap-[8px] rounded-[12px] px-[12px] h-[44px] bg-apjek-surface">
          <input
            v-model="routineLabel"
            placeholder="새 루틴 이름 작성"
            maxlength="50"
            class="flex-1 min-w-0 h-11 bg-transparent text-[14px] text-apjek-text outline-none focus-visible:ring-2 focus-visible:ring-apjek-blue/30"
            @keydown.enter="!$event.isComposing && ($event.preventDefault(), createRoutine())"
          >
          <button
            type="button"
            class="relative after:absolute after:-inset-2 after:content-[''] size-[28px] rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-95"
            :class="canCreateRoutine ? 'bg-apjek-blue' : 'bg-apjek-blue-soft text-apjek-blue-deep/50'"
            :disabled="!canCreateRoutine || routineBusy"
            aria-label="루틴 추가"
            @click="createRoutine"
          >
            <Icon name="lucide:plus" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 루틴 목록 — "수영 · 화" / "청소 · 매일" + 빨강 휴지통 (수정 버튼 없음 — 댓글 #29 취지) -->
      <p class="text-[13px] font-bold text-apjek-text pt-[4px]">루틴 목록</p>
      <CommonLoading v-if="pending" />
      <div v-else-if="loadFailed" class="text-[12px] text-apjek-text-faint text-center py-[10px]">
        <p>정보를 불러오지 못했어요</p>
        <button
          type="button"
          class="px-4 py-2 rounded-full bg-white text-apjek-text text-[13px] transition-all active:scale-95"
          @click="loadRoutines()"
        >다시 시도</button>
      </div>
      <div v-else-if="routines.length === 0" class="text-[12px] text-apjek-text-faint text-center py-[10px]">
        매일 반복할 항목을 루틴으로 등록해보세요
      </div>
      <div
        v-for="r in routines"
        :key="r.id"
        class="flex items-center gap-[12px] rounded-[12px] px-[12px] h-[48px] bg-apjek-bg"
      >
        <span class="flex-1 min-w-0 truncate text-[14px] text-apjek-text">
          {{ r.label }} <span class="text-apjek-text-faint">· {{ repeatSummary(r) }}</span>
        </span>
        <button
          type="button"
          class="relative after:absolute after:-inset-2 after:content-[''] size-[28px] rounded-full flex items-center justify-center shrink-0 transition active:scale-95 disabled:opacity-40"
          aria-label="루틴 삭제"
          :disabled="routineBusy"
          @click="routineDeleteTarget = r"
        >
          <Icon name="lucide:trash-2" class="w-4 h-4 text-riso-poppy" />
        </button>
      </div>

    </div>

    <!-- 하단 고정 CTA — 세그먼트별 -->
    <template #footer>
      <template v-if="segment === 'list'">
        <div class="flex items-center justify-between text-[12px] text-apjek-text-faint pb-[8px]">
          <span>{{ checkedCount }}/{{ todos.length }} 완료</span>
          <!-- 지급량은 서버가 결정 — 하드코딩 수치 노출 금지 (R4-FE) -->
          <span>완료 시 이슬토큰 지급</span>
        </div>
        <button
          type="button"
          class="w-full h-[48px] rounded-full flex items-center justify-center gap-2 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-100"
          :class="allChecked ? 'bg-apjek-cta text-white' : 'bg-apjek-bg text-apjek-text-faint cursor-default'"
          :disabled="!allChecked || submitting"
          @click="onSubmit"
        >
          <Icon name="lucide:check" class="w-4 h-4" />
          {{ allChecked ? '기록 완료' : '모든 항목 체크 후 완료 가능' }}
        </button>
      </template>
      <!-- 완료 — 추가/삭제는 즉시 API 로 반영되므로 이 버튼은 시트 닫기 역할이다 (일괄 저장 아님) -->
      <button
        v-else
        type="button"
        class="w-full h-[48px] rounded-full flex items-center justify-center gap-2 text-[14px] font-semibold bg-apjek-cta text-white transition-all active:scale-[0.98]"
        @click="emit('close')"
      >
        <Icon name="lucide:check" class="w-4 h-4" />
        완료
      </button>
    </template>
  </CommonBottomSheet>
  <RecordConfirmDialog
    :open="routineDeleteTarget !== null" title="루틴을 삭제할까요?"
    :message="`'${routineDeleteTarget?.label ?? ''}' 루틴을 삭제해요. 오늘 할 일은 유지돼요.`"
    confirm-text="삭제하기" :busy="routineBusy"
    @close="!routineBusy && (routineDeleteTarget = null)"
    @confirm="routineDeleteTarget && removeRoutine(routineDeleteTarget)"
  />
</template>

<script setup lang="ts">
import type { TodoRoutineListResponse, TodoRoutineRequest, TodoRoutineResponse } from '@terraworld-it/openapi-frontend'
import { addManualTodo, mergeRoutineTodos, sortTodos, TODO_LIMIT, type TodoItem } from '~/utils/todoList'
import { kstTodayKey } from '~/utils/habitState'

/**
 * 투두리스트 기록 시트 (R1b) — 리스트 메뉴(당일 항목 + 완료) / 루틴 설정(매일·요일 루틴 CRUD).
 * 항목 상태는 시트가 소유하고(페이지에 상시 마운트돼 닫아도 유지), 완료 시 note 를 submit 으로
 * 위임한다. 저장 성공 후 부모가 `clear()` 로 비운다. 루틴 변이는 즉시 API — 실패는 비차단 안내.
 */
const props = defineProps<{
  open: boolean
  /** 부모의 기록 저장 진행 중 */
  submitting?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [note: string]
}>()

const { sdk, client } = useOpenApi()
const toast = useToast()

// 루틴 상한 30 — 계약 §7(N-B10) 서버 상한과 동일. 서버 409 TODO_ROUTINE_LIMIT_EXCEEDED 메시지는 그대로 표시한다.
const ROUTINE_LIMIT_FE = 30

type Segment = 'list' | 'routine'
const segment = ref<Segment>('list')

// ── 리스트 ──
// 항목은 서버 저장 대상이 아니라(완료 시 note 로만 전달) 시트가 소유한다. 다만 앱 재시작·새로고침으로
// 당일 항목이 사라지지 않도록 KST 날짜 키로 localStorage 에 보관하고, 날짜가 바뀌면 비운다.
const todos = ref<TodoItem[]>([])
const TODO_STORAGE_PREFIX = 'tw.todos.'

function todoStorageKey(): string {
  return TODO_STORAGE_PREFIX + kstTodayKey()
}

function loadStoredTodos(): TodoItem[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(todoStorageKey())
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t): t is TodoItem => !!t && typeof t === 'object' && typeof (t as TodoItem).id === 'string' && typeof (t as TodoItem).text === 'string')
  }
  catch {
    return []
  }
}

function persistTodos(items: TodoItem[]): void {
  if (!import.meta.client) return
  try {
    // 어제 키 정리 — 오늘 키 하나만 남긴다.
    Object.keys(localStorage).filter(k => k.startsWith(TODO_STORAGE_PREFIX) && k !== todoStorageKey()).forEach(k => localStorage.removeItem(k))
    if (items.length === 0) localStorage.removeItem(todoStorageKey())
    else localStorage.setItem(todoStorageKey(), JSON.stringify(items))
  }
  catch {
    // 저장소 불가(프라이빗 모드 등)는 무시 — 메모리 상태만으로 동작한다.
  }
}

watch(todos, (items) => persistTodos(items))
const newText = ref<string>('')
const checkedCount = computed<number>(() => todos.value.filter(t => t.checked).length)
const allChecked = computed<boolean>(() => todos.value.length > 0 && todos.value.every(t => t.checked))

function switchSegment(next: Segment) {
  if (props.submitting) return
  if (segment.value === next) return
  void dismissKeyboard()
  segment.value = next
}

function onAdd() {
  if (props.submitting) return
  const next = addManualTodo(todos.value, newText.value)
  if (!next) {
    if (todos.value.length >= TODO_LIMIT) toast.error(`최대 ${TODO_LIMIT}개까지 추가할 수 있어요`)
    return
  }
  todos.value = next
  newText.value = ''
}

function toggleTodo(id: string) {
  if (props.submitting) return
  todos.value = todos.value.map(t => (t.id === id ? { ...t, checked: !t.checked } : t))
}

function removeTodo(id: string) {
  if (props.submitting) return
  todos.value = todos.value.filter(t => t.id !== id)
}

function onSubmit() {
  if (!allChecked.value || props.submitting) return
  void dismissKeyboard()
  emit('submit', todos.value.map(t => `✓ ${t.text}`).join('\n'))
}

/** 저장 성공 후 부모가 호출 — 항목 비우기 */
function clear() {
  todos.value = []
  newText.value = ''
}

// ── 루틴 ──
const routines = shallowRef<TodoRoutineResponse[]>([])
const routineFormOpen = ref<boolean>(false)
const routineLabel = ref<string>('')
const repeatType = ref<TodoRoutineRequest['repeatType']>('DAILY')
const selectedDays = ref<number[]>([])
const routineBusy = ref<boolean>(false)
const routineDeleteTarget = ref<TodoRoutineResponse | null>(null)

// 표시 순서는 디자인(월~일), value 는 스키마 0=일~6=토 — JS getDay() 와 동일 규약.
const WEEKDAYS: { label: string; value: number }[] = [
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
  { label: '일', value: 0 },
]
const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6]
const DAY_NAMES: string[] = ['일', '월', '화', '수', '목', '금', '토']

const canCreateRoutine = computed<boolean>(() =>
  routineLabel.value.trim().length > 0 && (repeatType.value === 'DAILY' || selectedDays.value.length > 0))

function setRepeat(next: TodoRoutineRequest['repeatType']) {
  repeatType.value = next
  // 매일 반복 = 요일 전체 자동 선택 (댓글 #64); 요일 지정으로 바꾸면 비워서 직접 고르게 한다.
  selectedDays.value = next === 'DAILY' ? [...ALL_DAYS] : []
}

function toggleDay(v: number) {
  if (repeatType.value === 'DAILY') return
  selectedDays.value = selectedDays.value.includes(v)
    ? selectedDays.value.filter(x => x !== v)
    : [...selectedDays.value, v]
}

function resetRoutineForm() {
  routineLabel.value = ''
  repeatType.value = 'DAILY'
  selectedDays.value = [...ALL_DAYS]
}

function closeRoutineForm() {
  void dismissKeyboard()
  routineFormOpen.value = false
  resetRoutineForm()
}

function repeatSummary(r: TodoRoutineResponse): string {
  if (r.repeatType === 'DAILY') return '매일'
  // 월~일 순으로 정렬해 표시 (0=일 을 맨 뒤로)
  const days = [...(r.daysOfWeek ?? [])].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
  return days.map(d => DAY_NAMES[d]).join('·') || '요일 미지정'
}

// 오늘 요일 해당 루틴(DAILY 전부 + WEEKLY 중 오늘 포함)을 미체크 항목으로 프리필 — routineId 로 dedupe.
// 저장 중에 도착한 루틴은 버리지 않고 보관했다가 저장이 끝나면 반영한다(요구는 잠금이지 폐기가 아니다).
const pendingRoutinePrefill = ref<TodoRoutineResponse[]>([])
function prefillFromRoutines(list: TodoRoutineResponse[]): void {
  if (props.submitting) {
    pendingRoutinePrefill.value = [...pendingRoutinePrefill.value, ...list]
    return
  }
  const todayDow = new Date().getDay()
  const due = list.filter(r => r.repeatType === 'DAILY' || (r.daysOfWeek ?? []).includes(todayDow))
  todos.value = mergeRoutineTodos(todos.value, due)
}

watch(() => props.submitting, (submitting) => {
  if (submitting || pendingRoutinePrefill.value.length === 0) return
  const pending = pendingRoutinePrefill.value
  pendingRoutinePrefill.value = []
  prefillFromRoutines(pending)
})

// 첫 조회만 로딩 표시하고 이후 재조회는 기존 목록을 유지한다.
const pending = ref<boolean>(false)
const loadFailed = ref<boolean>(false)
let routinesLoaded: boolean = false
let routinesInFlight: boolean = false
let routinesGeneration: number = 0

onBeforeUnmount(() => { routinesGeneration++ })

// 시트 열림 시 루틴 로드 — 실패해도 기존 투두 입력은 유지하고 명시 재시도를 제공한다.
async function loadRoutines(): Promise<void> {
  if (routinesInFlight) return
  routinesInFlight = true
  const generation = ++routinesGeneration
  pending.value = !routinesLoaded
  loadFailed.value = false
  await sdk.listTodoRoutines({ client }).then(({ data, error }) => {
    // 조회보다 나중에 완료된 생성·삭제 결과와 해제된 시트는 덮어쓰지 않는다.
    if (generation !== routinesGeneration) return
    if (error) {
      loadFailed.value = true
      return
    }
    const list = castData<TodoRoutineListResponse>(data)?.routines ?? []
    // 최근 추가 상단 (댓글 #62) — createdAt 내림차순
    routines.value = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    routinesLoaded = true
    prefillFromRoutines(list)
  }).catch(() => {
    if (generation === routinesGeneration) loadFailed.value = true
  }).finally(() => {
    routinesInFlight = false
    pending.value = false
  })
}

async function createRoutine() {
  if (!canCreateRoutine.value || routineBusy.value) return
  if (routines.value.length >= ROUTINE_LIMIT_FE) {
    toast.error(`루틴은 최대 ${ROUTINE_LIMIT_FE}개까지 만들 수 있어요`)
    return
  }
  routineBusy.value = true
  try {
    const body: TodoRoutineRequest = {
      label: routineLabel.value.trim(),
      repeatType: repeatType.value,
      daysOfWeek: repeatType.value === 'WEEKLY' ? [...selectedDays.value].sort((a, b) => a - b) : null,
    }
    const { data, error, response } = await sdk.createTodoRoutine({ client, body })
    if (error) {
      // 409 = 서버 상한(30) — 서버 메시지를 그대로 보여 준다.
      toast.error(response.status === 409
        ? errMsg(error, '루틴 개수 상한에 도달했어요')
        : '루틴 추가에 실패했어요. 잠시 후 다시 시도해주세요')
      return
    }
    const created = castData<TodoRoutineResponse>(data)
    if (created) {
      routinesGeneration++
      routines.value = [created, ...routines.value]
      prefillFromRoutines([created]) // 오늘 해당분이면 즉시 항목 반영
      toast.success('루틴을 추가했어요')
    }
    closeRoutineForm() // 추가되면 접힘
  }
  catch {
    toast.error('잠시 후 다시 시도해주세요')
  }
  finally {
    routineBusy.value = false
  }
}

async function removeRoutine(r: TodoRoutineResponse) {
  if (routineBusy.value) return
  routineBusy.value = true
  try {
    const { error } = await sdk.deleteTodoRoutine({ client, path: { routineId: r.id } })
    if (error) {
      toast.error('루틴 삭제에 실패했어요. 잠시 후 다시 시도해주세요')
      return
    }
    routinesGeneration++
    routines.value = routines.value.filter(x => x.id !== r.id)
    // 프리필된 미체크 항목은 유지한다 — 루틴은 항목의 "출처"일 뿐, 오늘 목록의 소유자가 아님.
    toast.success('루틴을 삭제했어요')
    routineDeleteTarget.value = null
  }
  catch {
    toast.error('잠시 후 다시 시도해주세요')
  }
  finally {
    routineBusy.value = false
  }
}

watch(() => props.open, (open) => {
  if (open) {
    segment.value = 'list'
    routineFormOpen.value = false
    resetRoutineForm()
    if (todos.value.length === 0) todos.value = loadStoredTodos()
    todos.value = sortTodos(todos.value)
    void loadRoutines()
  }
})

defineExpose({ clear })
</script>
