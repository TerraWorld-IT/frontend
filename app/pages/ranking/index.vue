<template>
  <div class="riso-grain min-h-screen px-4 py-4 space-y-4">
    <!-- 헤더 -->
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
        랭킹
      </h2>
      <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
        이번 달 친구들과 함께 비교해보세요
      </p>
    </div>

    <!-- 종류 토글 -->
    <div class="flex gap-2">
      <button
        v-for="t in types"
        :key="t.value"
        type="button"
        class="flex-1 h-11 rounded-xl font-semibold text-[13px] transition-colors"
        :class="
          activeType === t.value
            ? 'bg-riso-pink text-white riso-shadow-sm'
            : 'bg-white text-riso-dark border border-black/10'
        "
        @click="activeType = t.value"
      >
        {{ t.label }}
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
      <span class="text-[12px] text-riso-dark/70">내 순위</span>
      <div class="flex items-center gap-3">
        <span class="font-bold text-[18px] text-riso-dark">{{ data.myRank }}위</span>
        <span class="text-[12px] text-riso-dark/60">· {{ data.myScore ?? 0 }}점</span>
      </div>
    </div>

    <!-- 리스트 -->
    <div v-if="pending" class="py-12 flex justify-center">
      <CommonLoading variant="spinner" />
    </div>
    <div v-else-if="fetchError" class="py-12 text-center text-riso-poppy text-sm">
      {{ fetchError }}
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
            <span v-if="entry.isSelf" class="text-[10px] text-riso-pink ml-1">(나)</span>
          </span>
        </div>
        <span class="text-sm font-semibold text-riso-dark/80">{{ entry.score }}점</span>
      </li>
    </ol>
    <div v-else class="py-12 text-center text-riso-dark/50 text-sm">
      이번 달은 아직 기록이 없어요. 첫 기록을 시작해보세요!
    </div>

    <!-- decoration 안내 -->
    <p v-if="activeType === 'decoration'" class="text-[11px] text-riso-dark/45 text-center pt-2">
      ※ 꾸미기 랭킹은 곧 시작될 예정이에요
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

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

const types = [
  { value: 'engagement' as const, label: '참여 (기록 수)' },
  { value: 'decoration' as const, label: '꾸미기 (배치 수)' },
]

const activeType = ref<'engagement' | 'decoration'>('engagement')
const activeYearMonth = ref<string>(currentYearMonth())

const data = ref<RankingResponse | null>(null)
const pending = ref(false)
const fetchError = ref<string>('')

const isCurrentMonth = computed(() => activeYearMonth.value === currentYearMonth())

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
    const { client } = useOpenApi()
    // SDK 자동 생성 전이라 client 의 generic GET 사용. spec sync 후 sdk.getMonthlyRanking 으로 마이그레이션.
    const { data: result, error } = await client.get<RankingResponse>({
      url: '/rankings/monthly',
      query: {
        type: activeType.value,
        yearMonth: activeYearMonth.value,
        limit: 50,
      },
    })
    if (error) throw new Error(errMsg(error, '랭킹을 불러오지 못했어요'))
    data.value = result ?? null
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
