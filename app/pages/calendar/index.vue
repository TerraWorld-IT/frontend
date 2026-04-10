<template>
  <div class="riso-grain min-h-screen space-y-[30px] pb-4">
    <!-- Initial loading -->
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">불러오기 실패</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
      <button
        class="mt-2 px-4 py-2 rounded-full bg-riso-pink text-white text-sm riso-shadow-sm"
        @click="load"
      >
        다시 시도
      </button>
    </div>

    <template v-else>
      <!-- 헤더 -->
      <div class="space-y-1">
        <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">캘린더</h2>
        <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
          나의 기록을 한눈에 확인하세요
        </p>
      </div>

      <!-- 활동 통계 -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:trending-up" class="w-5 h-5" />
            활동 통계
          </h3>
          <button
            type="button"
            class="text-xs font-medium text-[#97a8f1] hover:text-black transition-colors"
            @click="showDetailedStats = !showDetailedStats"
          >
            {{ showDetailedStats ? '접기' : '자세히보기' }}
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="p-4 rounded-[12px] text-center" style="background-color: #e8ecfc">
            <div class="text-[24px] font-bold text-black leading-[32px]">{{ stats?.todayRecords ?? 0 }}</div>
            <div class="text-[12px] text-[#525252] font-medium leading-[16px]">오늘</div>
          </div>
          <div class="p-4 rounded-[12px] text-center" style="background-color: #e8ecfc">
            <div class="text-[24px] font-bold text-black leading-[32px]">{{ stats?.thisWeekRecords ?? 0 }}</div>
            <div class="text-[12px] text-[#525252] font-medium leading-[16px]">이번 주</div>
          </div>
          <div class="p-4 rounded-[12px] text-center" style="background-color: #e8ecfc">
            <div class="text-[24px] font-bold text-black leading-[32px]">{{ stats?.totalRecords ?? 0 }}</div>
            <div class="text-[12px] text-[#525252] font-medium leading-[16px]">전체</div>
          </div>
        </div>

        <div v-if="showDetailedStats && stats && stats.byCategory.length > 0" class="space-y-3 mt-5 pt-5 border-t border-black/10">
          <div class="text-sm font-bold mb-3 text-black">카테고리별 기록</div>
          <div v-for="cat in stats.byCategory" :key="cat.categoryId" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-[12px] flex items-center justify-center text-lg" style="background-color: #e8ecfc">
              {{ cat.emoji ?? '🏷️' }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="font-semibold text-black">{{ cat.categoryName }}</span>
                <span class="font-bold text-black">{{ cat.count }}회</span>
              </div>
              <div class="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  style="background-color: #97a8f1"
                  :style="{ width: `${stats.totalRecords > 0 ? (cat.count / stats.totalRecords) * 100 : 0}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 달력 -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <!-- 달력 헤더 -->
        <div class="flex items-center justify-between mb-5">
          <button
            type="button"
            class="w-9 h-9 rounded-[12px] border border-black/10 flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
            @click="prevMonth"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <h3 class="text-lg font-bold text-black">{{ currentYear }}년 {{ currentMonth + 1 }}월</h3>
          <button
            type="button"
            class="w-9 h-9 rounded-[12px] border border-black/10 flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
            @click="nextMonth"
          >
            <Icon name="lucide:chevron-right" class="w-4 h-4" />
          </button>
        </div>

        <!-- 요일 헤더 -->
        <div class="grid grid-cols-7 gap-2 mb-2">
          <div v-for="day in DAYS" :key="day" class="text-center text-xs font-bold text-[#525252] py-2">
            {{ day }}
          </div>
        </div>

        <!-- 날짜 그리드 -->
        <div class="grid grid-cols-7 gap-2">
          <div v-for="i in startingDayOfWeek" :key="`empty-${i}`" class="aspect-square" />

          <button
            v-for="day in daysInMonth"
            :key="day"
            type="button"
            class="aspect-square rounded-[12px] p-1 text-sm relative transition-all font-semibold hover:shadow-md"
            :class="[
              isSelectedDay(day)
                ? 'bg-black text-white shadow-lg'
                : isToday(day)
                  ? 'border-2 border-black bg-white text-black'
                  : hasRecords(day)
                    ? 'border border-black/10 text-black'
                    : 'border border-black/10 bg-white text-black',
            ]"
            :style="!isSelectedDay(day) && hasRecords(day) ? 'background-color: #e8ecfc' : undefined"
            @click="selectDay(day)"
          >
            <div class="text-xs">{{ day }}</div>
            <div v-if="noteMap[dateKey(day)]" class="absolute top-1 right-1">
              <div class="w-1.5 h-1.5 rounded-full" style="background-color: #97a8f1" />
            </div>
          </button>
        </div>
      </div>

      <!-- 선택된 날짜 상세 -->
      <div v-if="selectedDate" class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:calendar" class="w-5 h-5" />
            {{ selectedDate.getMonth() + 1 }}월 {{ selectedDate.getDate() }}일
          </h3>
          <button
            type="button"
            class="w-8 h-8 rounded-[12px] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
            @click="selectedDate = null"
          >
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>

        <!-- 해당 날짜 기록 -->
        <div class="mb-4">
          <div class="text-sm font-bold mb-3 text-black">완료한 활동</div>
          <div v-if="selectedDayRecords.length > 0" class="space-y-2">
            <div
              v-for="record in selectedDayRecords"
              :key="record.id"
              class="flex items-center gap-3 p-3 rounded-[12px]"
              style="background-color: #e8ecfc"
            >
              <div class="w-8 h-8 flex items-center justify-center text-xl">
                {{ record.categoryEmoji ?? '🏷️' }}
              </div>
              <div class="flex-1">
                <div class="font-semibold text-sm text-black">{{ record.categoryName }}</div>
                <div class="text-xs text-[#525252]">
                  {{ formatTime(record.recordedDate) }}
                  <span v-if="record.duration"> · {{ record.duration }}분</span>
                </div>
              </div>
              <div class="px-3 py-1 rounded-[8px] text-xs font-bold text-white" style="background-color: #97a8f1">
                완료
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-[#a1a1a1] text-center py-6 bg-[#f5f5f5] rounded-[12px]">
            기록이 없습니다
          </div>
        </div>

        <!-- 메모 -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-bold text-black">메모</div>
            <button
              v-if="!isEditingNote"
              type="button"
              class="flex items-center gap-1 text-xs font-medium text-[#525252] hover:text-black transition-colors"
              @click="startEdit"
            >
              <Icon name="lucide:edit-2" class="w-3 h-3" />
              {{ selectedNote ? '수정' : '작성' }}
            </button>
          </div>

          <div v-if="isEditingNote" class="space-y-2">
            <textarea
              v-model="editingNoteText"
              rows="3"
              placeholder="이 날의 메모를 작성해보세요..."
              class="w-full rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 py-3 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#97a8f1] resize-none text-sm"
            />
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 h-10 rounded-[12px] bg-black text-white text-sm font-semibold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                :disabled="noteSaving"
                @click="saveNote"
              >
                <Icon name="lucide:check" class="w-4 h-4" />
                {{ noteSaving ? '저장 중...' : '저장' }}
              </button>
              <button
                type="button"
                class="w-10 h-10 rounded-[12px] border border-black/10 flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
                @click="cancelEdit"
              >
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div v-else class="p-4 bg-[#f5f5f5] rounded-[12px] text-sm min-h-[60px] text-[#525252]">
            <span v-if="selectedNote">{{ selectedNote }}</span>
            <span v-else class="text-[#a1a1a1]">메모가 없습니다</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  RecordResponse,
  StatisticsResponse,
  NoteResponse,
  PagedRecordResponse,
} from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default' })

const { sdk, client } = useOpenApi()
const toast = useToast()

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const pending = ref(true)
const fetchError = ref<Error | null>(null)

// Calendar state
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth()) // 0-indexed

// Records for current view month
const monthRecords = ref<RecordResponse[]>([])
// noteMap: YYYY-MM-DD -> note text (cached after fetch)
const noteMap = ref<Record<string, string>>({})
// Statistics
const stats = ref<StatisticsResponse | null>(null)

// Selected date state
const selectedDate = ref<Date | null>(null)
const selectedNote = ref<string | null>(null)
const isEditingNote = ref(false)
const editingNoteText = ref('')
const noteSaving = ref(false)

const showDetailedStats = ref(false)

// Computed calendar info
const currentYear = computed(() => viewYear.value)
const currentMonth = computed(() => viewMonth.value)

const firstDayOfMonth = computed(() => new Date(viewYear.value, viewMonth.value, 1))
const daysInMonth = computed(() => new Date(viewYear.value, viewMonth.value + 1, 0).getDate())
const startingDayOfWeek = computed(() => firstDayOfMonth.value.getDay())

const selectedDayRecords = computed(() => {
  if (!selectedDate.value) return []
  const selKey = toDateKey(selectedDate.value)
  return monthRecords.value.filter(r => r.recordedDate.slice(0, 10) === selKey)
})

function dateKey(day: number): string {
  const mm = String(viewMonth.value + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${viewYear.value}-${mm}-${dd}`
}

function toDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function hasRecords(day: number): boolean {
  const key = dateKey(day)
  return monthRecords.value.some(r => r.recordedDate.slice(0, 10) === key)
}

function isToday(day: number): boolean {
  const today = new Date()
  return (
    today.getFullYear() === viewYear.value
    && today.getMonth() === viewMonth.value
    && today.getDate() === day
  )
}

function isSelectedDay(day: number): boolean {
  if (!selectedDate.value) return false
  return (
    selectedDate.value.getFullYear() === viewYear.value
    && selectedDate.value.getMonth() === viewMonth.value
    && selectedDate.value.getDate() === day
  )
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function pickErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return fallback
}

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [statsRes, recRes] = await Promise.all([
      sdk.getRecordStatistics({ client }),
      sdk.listRecords({
        client,
        query: { year: viewYear.value, month: viewMonth.value + 1, size: 200 },
      }),
    ])
    if (statsRes.error) throw new Error(pickErrorMessage(statsRes.error, 'getRecordStatistics failed'))
    if (recRes.error) throw new Error(pickErrorMessage(recRes.error, 'listRecords failed'))
    stats.value = (statsRes.data as StatisticsResponse) ?? null
    monthRecords.value = (recRes.data as PagedRecordResponse | undefined)?.content ?? []
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error(pickErrorMessage(e, '불러오기 실패'))
  }
  finally {
    pending.value = false
  }
}

async function loadMonth() {
  try {
    const { data, error } = await sdk.listRecords({
      client,
      query: { year: viewYear.value, month: viewMonth.value + 1, size: 200 },
    })
    if (error) throw new Error(pickErrorMessage(error, 'listRecords failed'))
    monthRecords.value = (data as PagedRecordResponse | undefined)?.content ?? []
  }
  catch (e) {
    toast.error(pickErrorMessage(e, 'listRecords failed'))
  }
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewYear.value -= 1
    viewMonth.value = 11
  }
  else {
    viewMonth.value -= 1
  }
  selectedDate.value = null
  noteMap.value = {}
  loadMonth()
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewYear.value += 1
    viewMonth.value = 0
  }
  else {
    viewMonth.value += 1
  }
  selectedDate.value = null
  noteMap.value = {}
  loadMonth()
}

async function selectDay(day: number) {
  const key = dateKey(day)
  selectedDate.value = new Date(viewYear.value, viewMonth.value, day)
  isEditingNote.value = false
  editingNoteText.value = ''
  selectedNote.value = null

  // Fetch note if not cached
  if (noteMap.value[key] !== undefined) {
    selectedNote.value = noteMap.value[key] || null
    editingNoteText.value = noteMap.value[key] ?? ''
    return
  }
  try {
    const { data } = await sdk.getNote({ client, path: { date: key } })
    const text = (data as NoteResponse | undefined)?.note ?? ''
    noteMap.value[key] = text
    selectedNote.value = text || null
    editingNoteText.value = text
  }
  catch {
    // 404 = no note, that's fine
    noteMap.value[key] = ''
    selectedNote.value = null
  }
}

function startEdit() {
  editingNoteText.value = selectedNote.value ?? ''
  isEditingNote.value = true
}

function cancelEdit() {
  isEditingNote.value = false
  editingNoteText.value = selectedNote.value ?? ''
}

async function saveNote() {
  if (!selectedDate.value || noteSaving.value) return
  const key = toDateKey(selectedDate.value)
  noteSaving.value = true
  try {
    const text = editingNoteText.value.trim()
    if (text) {
      const { data, error } = await sdk.saveNote({ client, path: { date: key }, body: { note: text } })
      if (error) throw new Error(pickErrorMessage(error, '메모 저장 실패'))
      const saved = (data as NoteResponse | undefined)?.note ?? text
      noteMap.value[key] = saved
      selectedNote.value = saved
      toast.success('메모가 저장되었습니다')
    }
    else {
      // empty → delete
      const { error } = await sdk.deleteNote({ client, path: { date: key } })
      if (error) throw new Error(pickErrorMessage(error, '메모 삭제 실패'))
      noteMap.value[key] = ''
      selectedNote.value = null
      toast.success('메모가 삭제되었습니다')
    }
    isEditingNote.value = false
  }
  catch (e) {
    toast.error(pickErrorMessage(e, '메모 저장 실패'))
  }
  finally {
    noteSaving.value = false
  }
}

onMounted(load)
</script>
