<template>
  <div class="rounded-[16px] p-[12px] flex flex-col gap-[10px] bg-apjek-dew-bg">
    <p class="text-[13px] font-bold text-apjek-text">루틴 관리</p>

    <!-- 반복 주기 세그먼트 — 활성=블랙 필 (frame-todo-routine) -->
    <div class="flex gap-[8px]">
      <button
        type="button"
        class="flex-1 h-[38px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.97]"
        :class="repeatType === 'DAILY'
          ? 'bg-apjek-cta text-white'
          : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
        @click="repeatType = 'DAILY'"
      >
        매일 반복
      </button>
      <button
        type="button"
        class="flex-1 h-[38px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.97]"
        :class="repeatType === 'WEEKLY'
          ? 'bg-apjek-cta text-white'
          : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
        @click="repeatType = 'WEEKLY'"
      >
        요일 지정
      </button>
    </div>

    <!-- 요일 원형 토글 — 표시 순서는 월~일, 값은 스키마 규약 0=일~6=토 (types.gen.ts) -->
    <div v-if="repeatType === 'WEEKLY'" class="flex justify-between">
      <button
        v-for="d in WEEKDAYS"
        :key="d.value"
        type="button"
        class="size-[36px] rounded-full text-[12px] font-semibold transition-all active:scale-95"
        :class="selectedDays.includes(d.value)
          ? 'bg-apjek-blue text-white'
          : 'bg-apjek-surface text-apjek-text-sub border border-apjek-border-strong'"
        :aria-pressed="selectedDays.includes(d.value)"
        @click="toggleDay(d.value)"
      >
        {{ d.label }}
      </button>
    </div>

    <!-- 루틴 이름 입력 + 추가/수정 -->
    <div class="flex gap-[8px] items-center">
      <input
        v-model="label"
        :placeholder="editingId === null ? '새 루틴 추가' : '루틴 이름 수정'"
        maxlength="50"
        class="flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-surface text-apjek-text"
        @keydown.enter="submit"
      >
      <button
        v-if="editingId !== null"
        type="button"
        class="text-[12px] text-apjek-text-faint shrink-0 transition active:scale-95"
        :disabled="busy"
        @click="resetForm"
      >
        취소
      </button>
      <button
        type="button"
        class="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-95 bg-apjek-cta disabled:opacity-40"
        :disabled="busy"
        :aria-label="editingId === null ? '루틴 추가' : '루틴 수정 저장'"
        @click="submit"
      >
        <Icon :name="editingId === null ? 'lucide:plus' : 'lucide:check'" class="w-4 h-4" />
      </button>
    </div>

    <!-- 루틴 목록 (수정/삭제) -->
    <div v-if="routines.length > 0" class="flex flex-col gap-[6px]">
      <div
        v-for="r in routines"
        :key="r.id"
        class="flex items-center gap-[8px] rounded-[12px] bg-apjek-surface px-[12px] py-[8px]"
      >
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-apjek-text truncate">{{ r.label }}</p>
          <p class="text-[11px] text-apjek-text-faint">{{ repeatSummary(r) }}</p>
        </div>
        <button
          type="button"
          class="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
          aria-label="루틴 수정"
          :disabled="busy"
          @click="startEdit(r)"
        >
          <Icon name="lucide:pencil" class="w-3.5 h-3.5 text-apjek-text-sub" />
        </button>
        <button
          type="button"
          class="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
          aria-label="루틴 삭제"
          :disabled="busy"
          @click="remove(r)"
        >
          <Icon name="lucide:trash-2" class="w-3.5 h-3.5 text-riso-poppy" />
        </button>
      </div>
    </div>
    <p v-else class="text-[12px] text-apjek-text-faint text-center py-[4px]">
      매일 반복할 항목을 루틴으로 등록해보세요
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TodoRoutineRequest, TodoRoutineResponse } from '@terraworld-it/openapi-frontend'

/**
 * 투두 루틴 관리 (R1-FE) — 매일/요일 지정 반복 루틴의 생성·수정·삭제 UI.
 * 목록 상태(SoT)는 부모(record 페이지)가 소유하고, 본 컴포넌트는 변이 API 호출 후
 * 결과를 granular 이벤트로 반영시킨다 (재조회 없이 로컬 갱신 — 백엔드 미구현 기간 404 내성).
 * 모든 실패는 비차단 안내 문구로 처리한다 (백엔드 컨트롤러 구현 중 — 404 가능).
 */
const props = defineProps<{
  routines: TodoRoutineResponse[]
}>()

const emit = defineEmits<{
  created: [routine: TodoRoutineResponse]
  updated: [routine: TodoRoutineResponse]
  deleted: [routineId: number]
}>()

const { sdk, client } = useOpenApi()
const toast = useToast()

const label = ref<string>('')
const repeatType = ref<TodoRoutineRequest['repeatType']>('DAILY')
const selectedDays = ref<number[]>([])
const editingId = ref<number | null>(null)
const busy = ref<boolean>(false)

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

const DAY_NAMES: string[] = ['일', '월', '화', '수', '목', '금', '토']

function toggleDay(v: number) {
  selectedDays.value = selectedDays.value.includes(v)
    ? selectedDays.value.filter(x => x !== v)
    : [...selectedDays.value, v]
}

function repeatSummary(r: TodoRoutineResponse): string {
  if (r.repeatType === 'DAILY') return '매일 반복'
  // 월~일 순으로 정렬해 표시 (0=일 을 맨 뒤로)
  const days = [...(r.daysOfWeek ?? [])].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
  return days.map(d => DAY_NAMES[d]).join('·') || '요일 미지정'
}

function resetForm() {
  label.value = ''
  repeatType.value = 'DAILY'
  selectedDays.value = []
  editingId.value = null
}

function startEdit(r: TodoRoutineResponse) {
  editingId.value = r.id
  label.value = r.label
  repeatType.value = r.repeatType
  selectedDays.value = [...(r.daysOfWeek ?? [])]
}

async function submit() {
  const name = label.value.trim()
  if (!name) {
    toast.error('루틴 이름을 입력해주세요')
    return
  }
  if (repeatType.value === 'WEEKLY' && selectedDays.value.length === 0) {
    toast.error('반복할 요일을 선택해주세요')
    return
  }
  // 서버 409 의 클라이언트 선제 안내 (최대 20개)
  if (editingId.value === null && props.routines.length >= 20) {
    toast.error('루틴은 최대 20개까지 만들 수 있어요')
    return
  }
  if (busy.value) return
  busy.value = true
  try {
    const body: TodoRoutineRequest = {
      label: name,
      repeatType: repeatType.value,
      daysOfWeek: repeatType.value === 'WEEKLY' ? [...selectedDays.value].sort((a, b) => a - b) : null,
    }
    if (editingId.value === null) {
      const { data, error, response } = await sdk.createTodoRoutine({ client, body })
      if (error) {
        toast.error(response.status === 409
          ? '루틴은 최대 20개까지 만들 수 있어요'
          : '루틴 추가에 실패했어요. 잠시 후 다시 시도해주세요')
        return
      }
      const created = castData<TodoRoutineResponse>(data)
      if (created) {
        emit('created', created)
        toast.success('루틴을 추가했어요')
      }
      resetForm()
    }
    else {
      const { data, error } = await sdk.updateTodoRoutine({ client, path: { routineId: editingId.value }, body })
      if (error) {
        toast.error('루틴 수정에 실패했어요. 잠시 후 다시 시도해주세요')
        return
      }
      const updated = castData<TodoRoutineResponse>(data)
      if (updated) {
        emit('updated', updated)
        toast.success('루틴을 수정했어요')
      }
      resetForm()
    }
  }
  catch {
    // 네트워크 예외 — 비차단 안내 (백엔드 미구현 기간 포함)
    toast.error('잠시 후 다시 시도해주세요')
  }
  finally {
    busy.value = false
  }
}

async function remove(r: TodoRoutineResponse) {
  if (busy.value) return
  busy.value = true
  try {
    const { error } = await sdk.deleteTodoRoutine({ client, path: { routineId: r.id } })
    if (error) {
      toast.error('루틴 삭제에 실패했어요. 잠시 후 다시 시도해주세요')
      return
    }
    if (editingId.value === r.id) resetForm()
    emit('deleted', r.id)
    toast.success('루틴을 삭제했어요')
  }
  catch {
    toast.error('잠시 후 다시 시도해주세요')
  }
  finally {
    busy.value = false
  }
}
</script>
