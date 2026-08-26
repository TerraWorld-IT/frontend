<!--
  랭킹 팝업 (아프젝 T5 — Figma "랭킹팝업 - 기본/친구랭킹" 393×528, 댓글 #9 드래그로 하위 랭킹).
  헤더 "🏆 랭킹" + X / 내 순위 카드 "#{myRank} {닉네임} / 나의 보유 아이템 수 : {myScore}" /
  세그먼트 [🏆 전체 랭킹][👥 친구 랭킹] / 리스트 행 "#{rank} {닉네임} / 보유 아이템 수 : {score}" (내부 스크롤).
  데이터: `GET /rankings/monthly?type=items&scope=all|friends` — 보유 아이템 수(월 무관 현재값),
  0점도 myRank 산출(동점 올림픽). myRank null(미집계)이면 "순위 없음".
  열릴 때와 스코프 전환 시 조회. 로딩/빈 목록/실패(재시도) 상태를 구분해 보여준다.
  등록명: TerrariumRankingModal.
-->
<template>
  <TerrariumHomeDialog :open="open" title="랭킹" icon="🏆" aria-label="랭킹" @close="emit('close')">
    <!-- 내 순위 카드 -->
    <div
      class="rounded-2xl px-4 py-3 mb-3 flex items-center gap-3"
      style="background: var(--color-apjek-blue-soft)"
      data-testid="ranking-my-card"
    >
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style="background: var(--color-apjek-surface)" aria-hidden="true">🌍</div>
      <div class="min-w-0">
        <p class="text-[15px] font-extrabold text-apjek-text truncate" data-testid="ranking-my-rank">{{ myRankLabel }}</p>
        <p class="text-xs text-apjek-text-sub">나의 보유 아이템 수 : {{ myScore }}</p>
      </div>
    </div>

    <!-- 세그먼트 — 전체 / 친구 -->
    <div class="grid grid-cols-2 gap-2 mb-3" role="tablist" aria-label="랭킹 범위">
      <button
        v-for="seg in segments"
        :key="seg.scope"
        type="button"
        role="tab"
        :aria-selected="scope === seg.scope"
        :data-testid="`ranking-scope-${seg.scope}`"
        class="h-10 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
        :style="scope === seg.scope
          ? { background: 'var(--color-apjek-blue-soft)', color: 'var(--color-apjek-blue-deep)', border: '1px solid var(--color-apjek-blue)' }
          : { background: 'var(--color-apjek-surface)', color: 'var(--color-apjek-text-sub)', border: '1px solid var(--color-apjek-border-strong)' }"
        @click="scope = seg.scope"
      >
        <span aria-hidden="true">{{ seg.icon }}</span>{{ seg.label }}
      </button>
    </div>

    <!-- 리스트 — 내부 스크롤(드래그로 하위 랭킹) -->
    <div class="max-h-[42dvh] overflow-y-auto -mx-1 px-1" data-testid="ranking-list">
      <div v-if="loading" class="py-10 flex justify-center">
        <CommonLoading variant="spinner" />
      </div>
      <div v-else-if="errorMessage" class="py-8 text-center space-y-3" data-testid="ranking-error">
        <p class="text-xs text-apjek-text-sub">{{ errorMessage }}</p>
        <button type="button" class="apjek-chip apjek-chip-active text-xs px-4 py-2" @click="load">다시 시도</button>
      </div>
      <p v-else-if="entries.length === 0" class="py-10 text-center text-xs text-apjek-text-faint" data-testid="ranking-empty">
        {{ scope === 'friends' ? '아직 친구가 없어요 · 초대코드로 친구를 초대해 보세요' : '아직 랭킹이 없어요' }}
      </p>
      <ol v-else class="flex flex-col gap-2">
        <li
          v-for="entry in entries"
          :key="`${entry.rank}-${entry.userId}`"
          class="apjek-card px-4 py-3 flex items-center gap-3"
          :style="entry.isSelf ? { borderColor: 'var(--color-apjek-blue)' } : {}"
          :data-testid="`ranking-row-${entry.rank}`"
        >
          <span class="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0" style="background: var(--color-apjek-bg)" aria-hidden="true">🌍</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-apjek-text truncate">#{{ entry.rank }} {{ entry.nickname }}<span v-if="entry.isSelf" class="ml-1 text-[10px] font-semibold text-apjek-text-faint">(나)</span></p>
            <p class="text-xs text-apjek-text-sub">보유 아이템 수 : {{ entry.score }}</p>
          </div>
        </li>
      </ol>
    </div>
  </TerrariumHomeDialog>
</template>

<script setup lang="ts">
import type { RankingEntry, RankingResponse } from '@terraworld-it/openapi-frontend'

type RankingScope = RankingResponse['scope']

const props = defineProps<{
  open: boolean
  /** 내 순위 카드의 닉네임 — 응답 entries 에 본인(isSelf)이 있으면 그 닉네임을 우선한다 */
  nickname: string
}>()

const emit = defineEmits<{ close: [] }>()

const { sdk, client } = useOpenApi()
const { trackRankingViewed } = useGtagEvents()

const segments: { scope: RankingScope, icon: string, label: string }[] = [
  { scope: 'all', icon: '🏆', label: '전체 랭킹' },
  { scope: 'friends', icon: '👥', label: '친구 랭킹' },
]

const scope = ref<RankingScope>('all')
const data = shallowRef<RankingResponse | null>(null)
const loading = ref<boolean>(false)
const errorMessage = ref<string>('')
// 스코프를 빠르게 오갈 때 늦게 도착한 이전 응답이 현재 스코프를 덮지 않도록 요청 순번으로 판별.
let requestSeq = 0

const entries = computed<RankingEntry[]>(() => data.value?.entries ?? [])
const myScore = computed<number>(() => data.value?.myScore ?? 0)
const myNickname = computed<string>(() => entries.value.find(e => e.isSelf)?.nickname ?? props.nickname)
const myRankLabel = computed<string>(() => {
  const rank = data.value?.myRank
  return rank === null || rank === undefined ? `순위 없음 ${myNickname.value}` : `#${rank} ${myNickname.value}`
})

async function load(): Promise<void> {
  const seq = ++requestSeq
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: res, error } = await sdk.getMonthlyRanking({
      client,
      query: { type: 'items', scope: scope.value, limit: 50 },
    })
    if (seq !== requestSeq) return
    if (error) throw new Error(errMsg(error, '랭킹을 불러오지 못했어요'))
    data.value = castData<RankingResponse>(res) ?? null
    trackRankingViewed({ type: 'items', yearMonth: data.value?.yearMonth ?? '' })
  }
  catch (e) {
    if (seq !== requestSeq) return
    errorMessage.value = (e as Error).message
    data.value = null
  }
  finally {
    if (seq === requestSeq) loading.value = false
  }
}

// 열릴 때 + 스코프 전환 시 조회. 닫혀 있는 동안의 스코프 변경은 없다(세그먼트가 팝업 안에 있음).
watch(() => props.open, (open) => {
  if (open) void load()
}, { immediate: true })
watch(scope, () => {
  if (props.open) void load()
})
</script>
