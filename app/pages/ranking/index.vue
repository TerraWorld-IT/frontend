<template>
  <div class="riso-grain min-h-screen px-4 py-4 space-y-4">
    <!-- 헤더 -->
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
        {{ $t('ranking.title') }}
      </h2>
      <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
        {{ $t('ranking.subtitle') }}
      </p>
    </div>

    <!-- 종류 토글 -->
    <div class="flex gap-2">
      <button
        v-for="tp in types"
        :key="tp.value"
        type="button"
        class="flex-1 h-11 rounded-xl font-semibold text-[13px] transition-colors"
        :class="
          activeType === tp.value
            ? 'bg-riso-pink text-white riso-shadow-sm'
            : 'bg-white text-riso-dark border border-black/10'
        "
        @click="activeType = tp.value"
      >
        {{ tp.label }}
      </button>
    </div>

    <!-- 월 선택 -->
    <div class="flex items-center justify-between bg-white rounded-xl px-4 py-2 riso-shadow-sm">
      <button type="button" class="px-2 py-1 text-riso-dark/70 active:scale-95" @click="shiftMonth(-1)">
        ‹
      </button>
      <span class="font-semibold text-[14px] text-riso-dark">{{ activeYearMonth }}</span>
      <button type="button" class="px-2 py-1 text-riso-dark/70 active:scale-95 disabled:opacity-30" :disabled="isCurrentMonth" @click="shiftMonth(1)">
        ›
      </button>
    </div>

    <!-- 내 순위 -->
    <div
      v-if="data && data.myRank != null"
      class="bg-riso-butter/40 rounded-xl px-4 py-3 flex items-center justify-between riso-shadow-sm"
    >
      <span class="text-[12px] text-riso-dark/70">{{ $t('ranking.myRank') }}</span>
      <div class="flex items-center gap-3">
        <span class="font-bold text-[18px] text-riso-dark">{{ $t('ranking.rankSuffix', { rank: data.myRank }) }}</span>
        <span class="text-[12px] text-riso-dark/60">· {{ $t('ranking.scoreSuffix', { score: data.myScore ?? 0 }) }}</span>
      </div>
    </div>

    <!-- 리스트 -->
    <div v-if="pending" class="py-6">
      <CommonLoading variant="skeleton" />
    </div>
    <!-- 에러 상태 — 텍스트만으론 복구 수단이 없다 (audit C4-2) — 재시도 버튼 제공 -->
    <div v-else-if="fetchError" class="py-12 text-center space-y-3">
      <p class="text-riso-poppy text-sm">{{ fetchError }}</p>
      <button
        type="button"
        class="px-4 py-2 rounded-full bg-riso-sage text-white text-sm riso-shadow-sm active:scale-95 transition-transform"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>
    <ol v-else-if="data && data.entries.length > 0" class="space-y-1.5">
      <li
        v-for="entry in data.entries"
        :key="`${entry.rank}-${entry.userId}`"
        class="flex items-center justify-between bg-white rounded-xl px-4 py-3 riso-shadow-sm"
        :class="entry.isSelf ? 'ring-2 ring-riso-pink' : ''"
      >
        <div class="flex items-center gap-3">
          <span
            class="font-bold text-[15px] w-8 text-center"
            :class="rankColor(entry.rank)"
          >
            {{ entry.rank }}
          </span>
          <span class="text-sm font-medium text-riso-dark">
            {{ entry.nickname }}
            <span v-if="entry.isSelf" class="text-[10px] text-riso-pink ml-1">{{ $t('ranking.me') }}</span>
          </span>
        </div>
        <span class="text-sm font-semibold text-riso-dark/80">{{ $t('ranking.scoreSuffix', { score: entry.score }) }}</span>
      </li>
    </ol>
    <div v-else class="py-12 text-center text-riso-dark/50 text-sm">
      {{ $t('ranking.noRecords') }}
    </div>

    <!-- decoration 안내 -->
    <p v-if="activeType === 'decoration'" class="text-[11px] text-riso-dark/45 text-center pt-2">
      {{ $t('ranking.decorationNotice') }}
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

interface RankingEntry {
  rank: number
  userId: string
  nickname: string
  score: number
  isSelf: boolean
}

interface RankingResponse {
  type: 'engagement' | 'decoration'
  yearMonth: string
  entries: RankingEntry[]
  myRank: number | null
  myScore: number | null
}

const types = computed(() => [
  { value: 'engagement' as const, label: t('ranking.typeEngagement') },
  { value: 'decoration' as const, label: t('ranking.typeDecoration') },
])

const activeType = ref<'engagement' | 'decoration'>('engagement')
const activeYearMonth = ref<string>(currentYearMonth())

const data = ref<RankingResponse | null>(null)
const pending = ref<boolean>(false)
const fetchError = ref<string>('')

const isCurrentMonth = computed<boolean>(() => activeYearMonth.value === currentYearMonth())

function currentYearMonth(): string {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return ym
}

function shiftMonth(delta: number) {
  const parts = activeYearMonth.value.split('-').map(Number)
  const y = parts[0] ?? new Date().getFullYear()
  const m = parts[1] ?? new Date().getMonth() + 1
  const date = new Date(y, m - 1 + delta, 1)
  const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  // 미래 월 차단
  if (next > currentYearMonth()) return
  activeYearMonth.value = next
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-riso-poppy'
  if (rank === 2) return 'text-riso-walnut'
  if (rank === 3) return 'text-riso-sage'
  return 'text-riso-dark/60'
}

const { trackRankingViewed } = useGtagEvents()

async function load() {
  pending.value = true
  fetchError.value = ''
  try {
    const { sdk, client } = useOpenApi()
    // 2026-06-04: 생성 SDK getMonthlyRanking 으로 마이그레이션 (off-spec raw GET 제거).
    const { data: result, error } = await sdk.getMonthlyRanking({
      client,
      query: {
        type: activeType.value,
        yearMonth: activeYearMonth.value,
        limit: 50,
      },
    })
    if (error) throw new Error(errMsg(error, t('ranking.loadError')))
    // hey-api union unwrap → castData 로 로컬 RankingResponse shape 으로 정규화
    data.value = castData<RankingResponse>(result) ?? null
    trackRankingViewed({ type: activeType.value, yearMonth: activeYearMonth.value })
  }
  catch (e) {
    fetchError.value = (e as Error).message
    data.value = null
  }
  finally {
    pending.value = false
  }
}

watch([activeType, activeYearMonth], () => void load(), { immediate: true })
</script>
