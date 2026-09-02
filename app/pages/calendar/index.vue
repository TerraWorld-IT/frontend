<template>
  <div class="min-h-screen space-y-[28px] pb-4" data-testid="calendar-page">
    <!-- Initial loading: 현재 월의 실제 주 수와 같은 래퍼·패딩·간격을 그대로 예약한다. -->
    <div
      v-if="pending"
      class="flex flex-col gap-[28px]"
      data-testid="calendar-layout-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="로딩 중"
    >
      <div class="h-[52px] flex items-start justify-between gap-3" data-layout-anchor="calendar-header">
        <div class="space-y-1">
          <div class="h-[28px] w-24 rounded-lg bg-apjek-border animate-pulse" />
          <div class="h-[20px] w-48 rounded-lg bg-apjek-border animate-pulse" />
        </div>
        <div class="size-[34px] rounded-full bg-apjek-border animate-pulse" />
      </div>

      <div class="apjek-card p-5" data-layout-anchor="calendar-stats">
        <div class="mb-4 flex h-6 items-center justify-between">
          <div class="h-5 w-28 rounded-lg bg-apjek-border animate-pulse" />
          <div class="h-4 w-14 rounded-lg bg-apjek-border animate-pulse" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="n in 3" :key="n" class="h-20 rounded-[12px] bg-apjek-border animate-pulse" />
        </div>
      </div>

      <div class="apjek-card p-5" data-layout-anchor="calendar-grid">
        <div class="mb-5 flex items-center justify-between">
          <div class="size-11 -m-1 flex items-center justify-center">
            <div class="size-9 rounded-full bg-apjek-border animate-pulse" />
          </div>
          <div class="h-6 w-28 rounded-lg bg-apjek-border animate-pulse" />
          <div class="size-11 -m-1 flex items-center justify-center">
            <div class="size-9 rounded-full bg-apjek-border animate-pulse" />
          </div>
        </div>
        <div class="grid grid-cols-7 gap-2 mb-2">
          <div v-for="n in 7" :key="n" class="py-2">
            <div class="h-4 rounded-lg bg-apjek-border animate-pulse" />
          </div>
        </div>
        <div class="grid grid-cols-7 gap-2">
          <div
            v-for="n in calendarSkeletonCellCount"
            :key="n"
            class="aspect-square rounded-[12px] bg-apjek-border animate-pulse"
            data-testid="calendar-skeleton-cell"
          />
        </div>
      </div>
      <span class="sr-only">로딩 중</span>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">{{ $t('common.loadFail') }}</p>
      <!-- raw error.message 는 사용자에게 무의미/노출 위험 — 일반화된 안내 문구로 표시 -->
      <p class="text-xs text-riso-dark/60">{{ $t('common.loadFailDesc') }}</p>
      <button
        class="mt-2 px-4 py-2 rounded-full bg-riso-pink text-white text-sm riso-shadow-sm"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else>
      <!-- 헤더 — 아프젝: "캘린더 / 나의 기록을 한눈에 확인해요" + 우상단 X(모달형 → /record 복귀) (R5b) -->
      <div class="flex items-start justify-between gap-3" data-layout-anchor="calendar-header">
        <div class="space-y-1 min-w-0">
          <h2 class="font-bold text-[20px] leading-[28px] text-apjek-text tracking-[-0.45px]">{{ $t('calendar.title') }}</h2>
          <p class="text-[14px] leading-[20px] text-apjek-text-sub tracking-[-0.15px]">
            {{ $t('calendar.subtitle') }}
          </p>
        </div>
        <button
          type="button"
          class="group size-11 -m-[5px] flex items-center justify-center shrink-0"
          aria-label="기록하기로 돌아가기"
          @click="navigateTo('/record')"
        >
          <span class="size-[34px] rounded-full border border-apjek-border-strong bg-apjek-surface flex items-center justify-center transition-all group-active:scale-95">
            <Icon name="lucide:x" class="w-4 h-4 text-apjek-text" />
          </span>
        </button>
      </div>

      <!-- 활동 통계 (FE 실 통계 — 아프젝 디자인엔 없으나 실기능 보존, 팔레트만 정합) -->
      <div class="apjek-card p-5" data-layout-anchor="calendar-stats">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-apjek-text">
            <Icon name="lucide:trending-up" class="w-5 h-5" />
            {{ $t('calendar.activityStats') }}
          </h3>
          <button
            type="button"
            class="py-[14.5px] -my-[14.5px] text-xs font-medium text-apjek-blue hover:text-apjek-text transition-colors"
            @click="showDetailedStats = !showDetailedStats"
          >
            {{ showDetailedStats ? $t('calendar.collapse') : $t('calendar.viewDetail') }}
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="p-4 rounded-[12px] text-center bg-apjek-blue-soft">
            <div class="text-[24px] font-bold text-apjek-text leading-[32px]">{{ stats?.todayRecords ?? 0 }}</div>
            <div class="text-[12px] text-apjek-text-sub font-medium leading-[16px]">{{ $t('calendar.today') }}</div>
          </div>
          <div class="p-4 rounded-[12px] text-center bg-apjek-blue-soft">
            <div class="text-[24px] font-bold text-apjek-text leading-[32px]">{{ stats?.thisWeekRecords ?? 0 }}</div>
            <div class="text-[12px] text-apjek-text-sub font-medium leading-[16px]">{{ $t('calendar.thisWeek') }}</div>
          </div>
          <div class="p-4 rounded-[12px] text-center bg-apjek-blue-soft">
            <div class="text-[24px] font-bold text-apjek-text leading-[32px]">{{ stats?.totalRecords ?? 0 }}</div>
            <div class="text-[12px] text-apjek-text-sub font-medium leading-[16px]">{{ $t('calendar.total') }}</div>
          </div>
        </div>

        <div v-if="showDetailedStats && stats && stats.byCategory.length > 0" class="space-y-3 mt-5 pt-5 border-t border-apjek-border">
          <div class="text-sm font-bold mb-3 text-apjek-text">{{ $t('calendar.byCategory') }}</div>
          <div v-for="cat in stats.byCategory" :key="cat.categoryId" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-[12px] flex items-center justify-center text-lg bg-apjek-blue-soft">
              {{ cat.emoji ?? '🏷️' }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="font-semibold text-apjek-text">{{ cat.categoryName }}</span>
                <span class="font-bold text-apjek-text">{{ $t('calendar.countTimes', { n: cat.count }) }}</span>
              </div>
              <div class="h-2 bg-apjek-bg rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all bg-apjek-blue"
                  :style="{ width: `${stats.totalRecords > 0 ? (cat.count / stats.totalRecords) * 100 : 0}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 달력 — 아프젝: 라운드 원형 네비 + 라운드 사각 날짜 셀 (fig-calendar) -->
      <div class="apjek-card p-5" data-layout-anchor="calendar-grid">
        <!-- 달력 헤더 -->
        <div class="flex items-center justify-between mb-5">
          <button
            type="button"
            class="group size-11 -m-1 flex items-center justify-center"
            @click="prevMonth"
          >
            <span class="size-9 rounded-full border border-apjek-border-strong bg-apjek-surface flex items-center justify-center group-hover:bg-apjek-bg transition-colors group-active:scale-[0.97]">
              <Icon name="lucide:chevron-left" class="w-4 h-4" />
            </span>
          </button>
          <h3 class="text-lg font-bold text-apjek-text">{{ $t('calendar.yearMonth', { year: currentYear, month: currentMonth + 1 }) }}</h3>
          <button
            type="button"
            class="group size-11 -m-1 flex items-center justify-center"
            @click="nextMonth"
          >
            <span class="size-9 rounded-full border border-apjek-border-strong bg-apjek-surface flex items-center justify-center group-hover:bg-apjek-bg transition-colors group-active:scale-[0.97]">
              <Icon name="lucide:chevron-right" class="w-4 h-4" />
            </span>
          </button>
        </div>

        <!-- 요일 헤더 -->
        <div class="grid grid-cols-7 gap-2 mb-2">
          <div v-for="day in DAYS" :key="day" class="text-center text-xs font-medium text-apjek-text-faint py-2">
            {{ day }}
          </div>
        </div>

        <!-- 날짜 그리드 (R5b) — 오늘=검정 원, 기록 있는 날=도장 아이콘 + 강조색(#A1CCDB 계열, 댓글 #19),
             선택=강조 외곽선, 미래일=흐림 -->
        <div class="grid grid-cols-7 gap-2" data-testid="calendar-days-grid">
          <div v-for="i in startingDayOfWeek" :key="`empty-${i}`" class="aspect-square" />

          <button
            v-for="day in daysInMonth"
            :key="day"
            type="button"
            class="aspect-square rounded-[12px] p-1 text-sm relative transition-all font-semibold flex flex-col items-center justify-center gap-[2px] active:scale-95"
            :class="[
              hasRecords(day) ? 'bg-[#A1CCDB]/35 text-apjek-text' : 'bg-apjek-surface text-apjek-text',
              isSelectedDay(day) ? 'ring-2 ring-[#A1CCDB]' : 'border border-apjek-border',
              isFuture(day) ? 'opacity-40' : '',
            ]"
            :aria-label="`${day}일${hasRecords(day) ? ' 기록 있음' : ''}${isToday(day) ? ' 오늘' : ''}`"
            @click="selectDay(day)"
          >
            <span
              class="text-xs leading-none size-[22px] rounded-full flex items-center justify-center"
              :class="isToday(day) ? 'bg-apjek-cta text-white' : ''"
            >{{ day }}</span>
            <!-- 도장 — TODO(자산): 디자이너 도장 이미지(댓글 #23)로 교체. 현재 🌸 플레이스홀더 -->
            <span v-if="hasRecords(day)" class="text-[11px] leading-none" aria-hidden="true">🌸</span>
            <span v-if="noteMap[dateKey(day)]" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-apjek-blue" />
          </button>
        </div>
      </div>
    </template>

    <!-- 선택된 날짜 상세 — 바텀 시트 -->
    <CommonBottomSheet :open="selectedDate !== null" ariaLabel="날짜 기록" @close="closeSheet()">
      <div v-if="selectedDate" class="px-5 pt-1 pb-3">
        <div class="apjek-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold flex items-center gap-2 text-apjek-text">
              <Icon name="lucide:calendar" class="w-5 h-5" />
              {{ $t('calendar.monthDay', { month: selectedDate.getMonth() + 1, day: selectedDate.getDate() }) }}
            </h3>
          </div>

          <!-- 해당 날짜 기록 -->
          <div class="mb-4">
            <div class="text-sm font-bold mb-3 text-apjek-text">{{ $t('calendar.completedActivities') }}</div>
            <div v-if="selectedDayRecords.length > 0" class="space-y-2">
              <div
                v-for="record in selectedDayRecords"
                :key="record.id"
                class="p-3 rounded-[12px] relative bg-apjek-bg"
              >
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 flex items-center justify-center text-xl shrink-0">
                    {{ recordDisplayIcon(record) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm text-apjek-text">{{ recordDisplayLabel(record) }}</div>
                    <div class="text-xs text-apjek-text-sub">
                      {{ formatTime(record.createdAt) }}
                      <span v-if="record.duration"> · {{ $t('calendar.durationMin', { n: record.duration }) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="px-3 py-1 rounded-[8px] text-xs font-bold text-white bg-apjek-blue">
                      {{ $t('calendar.done') }}
                    </div>
                    <div class="relative">
                      <button
                        type="button"
                        class="w-8 h-8 rounded-full hover:bg-apjek-blue-soft flex items-center justify-center text-apjek-text-sub transition-colors"
                        @click="openMenuId = openMenuId === record.id ? null : record.id"
                      >
                        ⋯
                      </button>
                      <div v-if="openMenuId === record.id" class="fixed inset-0 z-10" @click="openMenuId = null" />
                      <Transition name="cal-menu">
                        <div
                          v-if="openMenuId === record.id"
                          class="absolute right-0 top-10 bg-apjek-surface rounded-[12px] shadow-lg border border-apjek-border overflow-hidden z-20 min-w-[120px]"
                        >
                          <button
                            type="button"
                            class="w-full px-4 py-2.5 text-left text-sm hover:bg-apjek-blue-soft flex items-center gap-2 text-apjek-blue font-semibold transition-colors"
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
                <div v-if="record.memo" class="text-sm text-apjek-text-sub mt-2 pl-9">
                  {{ record.memo }}
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-apjek-text-faint text-center py-6 bg-apjek-bg rounded-[12px]">
              {{ $t('calendar.noRecords') }}
            </div>
          </div>

          <!-- 메모 -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-bold text-apjek-text">{{ $t('calendar.memo') }}</div>
              <button
                v-if="!isEditingNote"
                type="button"
                class="flex items-center gap-1 text-xs font-medium text-apjek-text-sub hover:text-apjek-text transition-colors"
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
                class="w-full rounded-[12px] border border-apjek-border bg-apjek-bg px-4 py-3 text-apjek-text placeholder:text-apjek-text-faint focus:outline-none focus:ring-2 focus:ring-apjek-blue/40 resize-none text-sm"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 h-10 rounded-full bg-apjek-cta text-white text-sm font-semibold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                  :disabled="noteSaving"
                  @click="saveNote"
                >
                  <Icon name="lucide:check" class="w-4 h-4" />
                  {{ noteSaving ? $t('calendar.saving') : $t('common.save') }}
                </button>
                <button
                  type="button"
                  class="w-10 h-10 rounded-full border border-apjek-border-strong flex items-center justify-center hover:bg-apjek-bg transition-colors"
                  @click="cancelEdit"
                >
                  <Icon name="lucide:x" class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-else class="p-4 bg-apjek-bg rounded-[12px] text-sm min-h-[60px] text-apjek-text-sub">
              <span v-if="selectedNote">{{ selectedNote }}</span>
              <span v-else class="text-apjek-text-faint">{{ $t('calendar.noMemo') }}</span>
            </div>
          </div>
        </div>
      </div>
    </CommonBottomSheet>
  </div>
</template>

<script setup lang="ts">
import type {
  RecordResponse,
  StatisticsResponse,
  NoteResponse,
  PagedRecordResponse,
} from '@terraworld-it/openapi-frontend'
import { recordDisplayIcon, recordDisplayLabel } from '~/utils/constants'

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
// FE-10: 교체-대입 전용 리스트(로드/삭제 모두 `.value =` 재할당) — deep reactivity 불필요.
const monthRecords = shallowRef<RecordResponse[]>([])
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

// 날짜 바텀시트의 focus trap + 배경 스크롤 잠금 + ESC + Android 뒤로가기는
// CommonBottomSheet 가 내장 처리한다(이중 등록 금지).

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
const calendarSkeletonCellCount = computed<number>(() => Math.ceil((startingDayOfWeek.value + daysInMonth.value) / 7) * 7)

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

// 미래일 흐림 (Figma 캘린더) — 보는 달 기준 오늘 이후
function isFuture(day: number): boolean {
  const today = new Date()
  const target = new Date(viewYear.value, viewMonth.value, day)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return target.getTime() > todayStart.getTime()
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

// 월 기록 전체 수집 — 백엔드 월 조회가 pageable 계약을 지키게 되면서(2026-07-15 BE-16)
// 단일 요청은 최대 size(스펙 상한 50)건만 온다. 서버가 알려주는 totalPages 까지 전부
// 순회해 합친다 (대부분의 사용자는 1페이지 = 요청 1회로 종료).
async function fetchMonthRecords(year: number, month: number): Promise<RecordResponse[]> {
  const all: RecordResponse[] = []
  let totalPages = 1
  for (let page = 0; page < totalPages; page++) {
    const { data, error } = await sdk.listRecords({
      client,
      query: { year, month, page, size: 50 },
    })
    if (error) throw new Error(errMsg(error, 'listRecords failed'))
    const paged = castData<PagedRecordResponse>(data)
    if (!paged) break
    all.push(...paged.content)
    totalPages = paged.totalPages
  }
  return all
}

// 월 전환 세대 가드 — 연속 이전/다음 클릭 시 느린 이전 월 응답(다중 페이지)이 나중 요청
// 뒤에 도착해 현재 월 화면을 덮어쓰는 race 차단 (Codex 리뷰).
let monthLoadGen = 0

async function load() {
  const gen = ++monthLoadGen
  pending.value = true
  fetchError.value = null
  try {
    const [statsRes, records] = await Promise.all([
      sdk.getRecordStatistics({ client }),
      fetchMonthRecords(viewYear.value, viewMonth.value + 1),
    ])
    if (statsRes.error) throw new Error(errMsg(statsRes.error, 'getRecordStatistics failed'))
    stats.value = castData<StatisticsResponse>(statsRes.data) ?? null
    if (gen === monthLoadGen) monthRecords.value = records
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
  const gen = ++monthLoadGen
  try {
    const records = await fetchMonthRecords(viewYear.value, viewMonth.value + 1)
    if (gen === monthLoadGen) monthRecords.value = records
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
    const { data, error, response } = await sdk.getNote({ client, path: { date: key } })
    // SDK 는 HTTP 에러를 throw 하지 않고 { error } 로 반환한다. 이전엔 error 를 미검사해
    // 인증/서버 오류(401/500)도 "메모 없음"(빈 문자열)으로 캐시돼 세션 내내 메모가 사라진
    // 것처럼 보였다. 404(메모 미작성)만 정상 빈 상태로 캐시하고, 그 외 오류는 캐시하지
    // 않고 toast 로 알린다(다음 셀 클릭 시 재시도됨).
    if (error && response.status !== 404) {
      toast.error(errMsg(error, t('common.loadFailDesc')))
      return
    }
    const text = (data as NoteResponse | undefined)?.note ?? ''
    noteMap.value[key] = text
    selectedNote.value = text || null
    editingNoteText.value = text
  }
  catch {
    // 네트워크 예외 — 오류를 "메모 없음"으로 캐시하지 않는다(재시도 가능하게 유지).
    toast.error(t('common.loadFailDesc'))
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
/* 딤/시트 트랜지션은 CommonBottomSheet 로 이관 — 여기엔 기록 메뉴 팝오버만 남는다. */

/* 기록 메뉴 팝오버 */
.cal-menu-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.cal-menu-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
