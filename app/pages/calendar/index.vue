<template>
  <div class="riso-grain min-h-screen space-y-[30px] pb-4">
    <!-- Initial loading -->
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">{{ $t('common.loadFail') }}</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
      <button
        class="mt-2 px-4 py-2 rounded-full bg-riso-pink text-white text-sm riso-shadow-sm"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else>
      <!-- 헤더 -->
      <div class="space-y-1">
        <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">{{ $t('calendar.title') }}</h2>
        <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
          {{ $t('calendar.subtitle') }}
        </p>
      </div>

      <!-- 활동 통계 (FE 실 통계 — TW2 디자인엔 없으나 실기능 보존) -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:trending-up" class="w-5 h-5" />
            {{ $t('calendar.activityStats') }}
          </h3>
          <button
            type="button"
            class="text-xs font-medium text-[#97a8f1] hover:text-black transition-colors"
            @click="showDetailedStats = !showDetailedStats"
          >
            {{ showDetailedStats ? $t('calendar.collapse') : $t('calendar.viewDetail') }}
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="p-4 rounded-[12px] text-center" style="background-color: #e8ecfc">
            <div class="text-[24px] font-bold text-black leading-[32px]">{{ stats?.todayRecords ?? 0 }}</div>
            <div class="text-[12px] text-[#525252] font-medium leading-[16px]">{{ $t('calendar.today') }}</div>
          </div>
          <div class="p-4 rounded-[12px] text-center" style="background-color: #e8ecfc">
            <div class="text-[24px] font-bold text-black leading-[32px]">{{ stats?.thisWeekRecords ?? 0 }}</div>
            <div class="text-[12px] text-[#525252] font-medium leading-[16px]">{{ $t('calendar.thisWeek') }}</div>
          </div>
          <div class="p-4 rounded-[12px] text-center" style="background-color: #e8ecfc">
            <div class="text-[24px] font-bold text-black leading-[32px]">{{ stats?.totalRecords ?? 0 }}</div>
            <div class="text-[12px] text-[#525252] font-medium leading-[16px]">{{ $t('calendar.total') }}</div>
          </div>
        </div>

        <div v-if="showDetailedStats && stats && stats.byCategory.length > 0" class="space-y-3 mt-5 pt-5 border-t border-black/10">
          <div class="text-sm font-bold mb-3 text-black">{{ $t('calendar.byCategory') }}</div>
          <div v-for="cat in stats.byCategory" :key="cat.categoryId" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-[12px] flex items-center justify-center text-lg" style="background-color: #e8ecfc">
              {{ cat.emoji ?? '🏷️' }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="font-semibold text-black">{{ cat.categoryName }}</span>
                <span class="font-bold text-black">{{ $t('calendar.countTimes', { n: cat.count }) }}</span>
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
            class="w-9 h-9 rounded-[12px] border border-black/10 flex items-center justify-center hover:bg-[#f5f5f5] transition-colors active:scale-[0.97]"
            @click="prevMonth"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <h3 class="text-lg font-bold text-black">{{ $t('calendar.yearMonth', { year: currentYear, month: currentMonth + 1 }) }}</h3>
          <button
            type="button"
            class="w-9 h-9 rounded-[12px] border border-black/10 flex items-center justify-center hover:bg-[#f5f5f5] transition-colors active:scale-[0.97]"
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
            class="aspect-square rounded-[12px] p-1 text-sm relative transition-all font-semibold hover:shadow-md hover:scale-105 active:scale-95"
            :class="[
              isSelectedDay(day)
                ? 'bg-black text-white shadow-lg'
                : hasRecords(day)
                  ? 'border border-black/10'
                  : 'border border-black/10 bg-white',
              isToday(day) && !isSelectedDay(day) ? 'border-2 border-black' : '',
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
    </template>

    <!-- 선택된 날짜 상세 — 바텀 시트 -->
    <Transition name="cal-dim">
      <div
        v-if="selectedDate"
        class="fixed inset-0 bg-black/30 z-40"
        @click="closeSheet()"
      />
    </Transition>
    <Transition name="cal-sheet">
      <div
        v-if="selectedDate"
        ref="sheetRoot"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex flex-col rounded-t-3xl shadow-2xl bg-white"
        style="max-height: calc(100dvh - 98px - 20px)"
        role="dialog"
        aria-modal="true"
        aria-label="날짜 기록"
      >
        <!-- 핸들 -->
        <div class="flex justify-center pt-3 pb-1 shrink-0">
          <div class="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div class="flex-1 overflow-y-auto px-5 pt-1" style="padding-bottom: calc(32px + env(safe-area-inset-bottom, 0px))">
          <div class="bg-white rounded-[16px] border border-black/10 p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold flex items-center gap-2 text-black">
                <Icon name="lucide:calendar" class="w-5 h-5" />
                {{ $t('calendar.monthDay', { month: selectedDate.getMonth() + 1, day: selectedDate.getDate() }) }}
              </h3>
              <button
                type="button"
                class="w-8 h-8 rounded-[12px] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
                @click="closeSheet()"
              >
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <!-- 해당 날짜 기록 -->
            <div class="mb-4">
              <div class="text-sm font-bold mb-3 text-black">{{ $t('calendar.completedActivities') }}</div>
              <div v-if="selectedDayRecords.length > 0" class="space-y-2">
                <div
                  v-for="record in selectedDayRecords"
                  :key="record.id"
                  class="p-3 rounded-[12px] relative"
                  style="background-color: #e8ecfc"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 flex items-center justify-center text-xl shrink-0">
                      {{ (record.dailyType && DAILY_TYPE_ICONS[record.dailyType]) || record.categoryEmoji || '🏷️' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-sm text-black">{{ (record.dailyType && DAILY_TYPE_LABELS[record.dailyType]) || record.categoryName }}</div>
                      <div class="text-xs text-[#525252]">
                        {{ formatTime(record.recordedDate) }}
                        <span v-if="record.duration"> · {{ $t('calendar.durationMin', { n: record.duration }) }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="px-3 py-1 rounded-[8px] text-xs font-bold text-white" style="background-color: #97a8f1">
                        {{ $t('calendar.done') }}
                      </div>
                      <div class="relative">
                        <button
                          type="button"
                          class="w-8 h-8 rounded-full hover:bg-[#d4dcf9] flex items-center justify-center text-[#525252] transition-colors"
                          @click="openMenuId = openMenuId === record.id ? null : record.id"
                        >
                          ⋯
                        </button>
                        <div v-if="openMenuId === record.id" class="fixed inset-0 z-10" @click="openMenuId = null" />
                        <Transition name="cal-menu">
                          <div
                            v-if="openMenuId === record.id"
                            class="absolute right-0 top-10 bg-white rounded-[12px] shadow-lg border border-black/10 overflow-hidden z-20 min-w-[120px]"
                          >
                            <button
                              type="button"
                              class="w-full px-4 py-2.5 text-left text-sm hover:bg-[#e8ecfc] flex items-center gap-2 text-[#97a8f1] font-semibold transition-colors"
                              :disabled="deletingId === record.id"
                              @click="removeRecord(record)"
                            >
                              <Icon name="lucide:trash-2" class="w-4 h-4" />
                              {{ $t('common.delete') }}
                            </button>
                          </div>
                        </Transition>
                      </div>
                    </div>
                  </div>
                  <div v-if="record.memo" class="text-sm text-[#525252] mt-2 pl-9">
                    {{ record.memo }}
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-[#a1a1a1] text-center py-6 bg-[#f5f5f5] rounded-[12px]">
                {{ $t('calendar.noRecords') }}
              </div>
            </div>

            <!-- 메모 -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="text-sm font-bold text-black">{{ $t('calendar.memo') }}</div>
                <button
                  v-if="!isEditingNote"
                  type="button"
                  class="flex items-center gap-1 text-xs font-medium text-[#525252] hover:text-black transition-colors"
                  @click="startEdit"
                >
                  <Icon name="lucide:edit-2" class="w-3 h-3" />
                  {{ selectedNote ? $t('calendar.memoEdit') : $t('calendar.memoWrite') }}
                </button>
              </div>

              <div v-if="isEditingNote" class="space-y-2">
                <textarea
                  v-model="editingNoteText"
                  rows="3"
                  :placeholder="$t('calendar.memoPlaceholder')"
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
                    {{ noteSaving ? $t('calendar.saving') : $t('common.save') }}
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
                <span v-else class="text-[#a1a1a1]">{{ $t('calendar.noMemo') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type {
  RecordResponse,
  StatisticsResponse,
  NoteResponse,
  PagedRecordResponse,
} from '@terraworld-it/openapi-frontend'
import { DAILY_TYPE_ICONS, DAILY_TYPE_LABELS } from '~/utils/constants'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()

const DAYS = computed<string[]>(() => [
  t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'),
  t('calendar.thu'), t('calendar.fri'), t('calendar.sat'),
])

const pending = ref<boolean>(true)
const fetchError = ref<Error | null>(null)

// Calendar state
const now = new Date()
const viewYear = ref<number>(now.getFullYear())
const viewMonth = ref<number>(now.getMonth()) // 0-indexed

// Records for current view month
const monthRecords = ref<RecordResponse[]>([])
// noteMap: YYYY-MM-DD -> note text (cached after fetch)
const noteMap = ref<Record<string, string>>({})
// Statistics
const stats = ref<StatisticsResponse | null>(null)

// Selected date state
const selectedDate = ref<Date | null>(null)
const selectedNote = ref<string | null>(null)
const isEditingNote = ref<boolean>(false)
const editingNoteText = ref<string>('')
const noteSaving = ref<boolean>(false)

// bespoke 바텀시트 role="dialog" aria-modal="true" 에 실제 focus trap 부여(Codex Round 3 지적).
const sheetRoot = ref<HTMLElement | null>(null)
useDialogFocusTrap(sheetRoot, computed(() => selectedDate.value !== null))

// Android 하드웨어 뒤로가기 — 날짜 바텀시트가 열려있으면 라우트 이동 전에 먼저 닫는다.
const { pushBackHandler } = useBackButtonStack()
let unregisterSheetBackHandler: (() => void) | null = null
watch(selectedDate, (date) => {
  if (date) {
    unregisterSheetBackHandler = pushBackHandler(() => closeSheet())
  } else {
    unregisterSheetBackHandler?.()
    unregisterSheetBackHandler = null
  }
})
onBeforeUnmount(() => {
  unregisterSheetBackHandler?.()
  unregisterSheetBackHandler = null
})

// Record row menu / delete
const openMenuId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

const showDetailedStats = ref<boolean>(false)

// Computed calendar info
const currentYear = computed<number>(() => viewYear.value)
const currentMonth = computed<number>(() => viewMonth.value)

const firstDayOfMonth = computed<Date>(() => new Date(viewYear.value, viewMonth.value, 1))
const daysInMonth = computed<number>(() => new Date(viewYear.value, viewMonth.value + 1, 0).getDate())
const startingDayOfWeek = computed<number>(() => firstDayOfMonth.value.getDay())

const selectedDayRecords = computed<RecordResponse[]>(() => {
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

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [statsRes, recRes] = await Promise.all([
      sdk.getRecordStatistics({ client }),
      sdk.listRecords({
        client,
        query: { year: viewYear.value, month: viewMonth.value + 1, size: 50 },
      }),
    ])
    if (statsRes.error) throw new Error(errMsg(statsRes.error, 'getRecordStatistics failed'))
    if (recRes.error) throw new Error(errMsg(recRes.error, 'listRecords failed'))
    stats.value = castData<StatisticsResponse>(statsRes.data) ?? null
    monthRecords.value = castData<PagedRecordResponse>(recRes.data)?.content ?? []
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error(errMsg(e, '불러오기 실패'))
  }
  finally {
    pending.value = false
  }
}

async function loadMonth() {
  try {
    const { data, error } = await sdk.listRecords({
      client,
      query: { year: viewYear.value, month: viewMonth.value + 1, size: 50 },
    })
    if (error) throw new Error(errMsg(error, 'listRecords failed'))
    monthRecords.value = (data as PagedRecordResponse | undefined)?.content ?? []
  }
  catch (e) {
    toast.error(errMsg(e, 'listRecords failed'))
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
  closeSheet()
  openMenuId.value = null
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
  closeSheet()
  openMenuId.value = null
  noteMap.value = {}
  loadMonth()
}

async function selectDay(day: number) {
  // 다른 날짜의 메모를 편집 중(textarea 포커스)이었다면 전환 전에 키보드 해제
  // (utils/keyboard.ts 참조 — 포커스 유지한 채 즉시 unmount 되면 키보드가 안 닫힐 수 있음).
  if (isEditingNote.value) void dismissKeyboard()
  const key = dateKey(day)
  selectedDate.value = new Date(viewYear.value, viewMonth.value, day)
  isEditingNote.value = false
  editingNoteText.value = ''
  selectedNote.value = null
  openMenuId.value = null

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
  void dismissKeyboard()
  isEditingNote.value = false
  editingNoteText.value = selectedNote.value ?? ''
}

// 날짜 시트를 닫는 모든 경로(백드롭/X/월 전환)가 공유 — 메모 편집 중이었다면 키보드 해제
// 후 닫는다 (utils/keyboard.ts 참조).
function closeSheet() {
  if (isEditingNote.value) void dismissKeyboard()
  selectedDate.value = null
}

async function saveNote() {
  if (!selectedDate.value || noteSaving.value) return
  const key = toDateKey(selectedDate.value)
  noteSaving.value = true
  try {
    const text = editingNoteText.value.trim()
    if (text) {
      const { data, error } = await sdk.saveNote({ client, path: { date: key }, body: { note: text } })
      if (error) throw new Error(errMsg(error, '메모 저장 실패'))
      const saved = (data as NoteResponse | undefined)?.note ?? text
      noteMap.value[key] = saved
      selectedNote.value = saved
      toast.success(t('calendar.memoSaved'))
    }
    else {
      // empty → delete
      const { error } = await sdk.deleteNote({ client, path: { date: key } })
      if (error) throw new Error(errMsg(error, '메모 삭제 실패'))
      noteMap.value[key] = ''
      selectedNote.value = null
      toast.success(t('calendar.memoDeleted'))
    }
    void dismissKeyboard()
    isEditingNote.value = false
  }
  catch (e) {
    toast.error(errMsg(e, '메모 저장 실패'))
  }
  finally {
    noteSaving.value = false
  }
}

async function removeRecord(record: RecordResponse) {
  if (deletingId.value !== null) return
  openMenuId.value = null
  deletingId.value = record.id
  try {
    const { error } = await sdk.deleteRecord({ client, path: { recordId: record.id } })
    if (error) throw new Error(errMsg(error, '기록 삭제 실패'))
    monthRecords.value = monthRecords.value.filter(r => r.id !== record.id)
    // i18n: calendar.recordDeleted 키 미존재 (shared) → TW2 카피 직접 사용
    toast.success('기록이 삭제되었습니다')
  }
  catch (e) {
    toast.error(errMsg(e, '기록 삭제 실패'))
  }
  finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
/* 딤 배경 페이드 */
.cal-dim-enter-active,
.cal-dim-leave-active {
  transition: opacity 0.2s ease;
}
.cal-dim-enter-from,
.cal-dim-leave-to {
  opacity: 0;
}

/* 바텀 시트 슬라이드업 (spring 근사) */
.cal-sheet-enter-active {
  transition: transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.15);
}
.cal-sheet-leave-active {
  transition: transform 0.28s ease-in;
}
.cal-sheet-enter-from,
.cal-sheet-leave-to {
  transform: translate(-50%, 100%);
}

/* 기록 메뉴 팝오버 */
.cal-menu-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.cal-menu-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
