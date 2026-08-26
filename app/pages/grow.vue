<template>
  <!-- 아프젝 리스킨: 페이지 전체가 블루 씬 — 디자이너 "바탕_키우기탭"(식물 실루엣, 하단이 앱 배경색으로
       페이드)을 폭 맞춤으로 깔고, 그 아래로 이어지는 영역은 그라디언트로 같은 색을 잇는다. 레이아웃 main 의
       px-5 / 상단(세이프에어리어 포함) 패딩을 음수 마진으로 상쇄해 풀블리드로 칠한다. -->
  <div
    class="-mx-5 px-5 pb-[24px] space-y-[16px]"
    :style="{
      marginTop: 'calc(-1rem - env(safe-area-inset-top, 0px))',
      paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
      background: 'url(/bg/grow.webp) center top / 100% auto no-repeat, linear-gradient(180deg, var(--color-apjek-grow-from) 0%, var(--color-apjek-grow-to) 58%, var(--color-apjek-bg) 100%)',
    }"
  >
    <!-- 헤더 (G7 확정 카피) -->
    <div>
      <h1 class="text-[26px] font-bold text-apjek-text tracking-[-0.8px] leading-[30px]">키우기</h1>
      <div class="mt-[8px] text-[13px] text-apjek-text/75 tracking-[-0.3px]">
        <p class="leading-[19px]">30일 동안 꾸준히 기록해서 정령과 판타지 식물을 키워요</p>
        <p class="leading-[19px]">반짝이로 빠르게 키울 수 있어요</p>
      </div>
    </div>

    <!-- 보유 반짝이 필 칩 (탭 시 습관 기록으로 이동 — 반짝이 획득 경로 안내) -->
    <button
      class="h-[38px] rounded-full bg-white border border-white/60 inline-flex items-center gap-[8px] pl-[8px] pr-[14px] transition-all active:scale-95"
      @click="onSparkleInfo"
    >
      <img src="/icons/token/sparkle.png" alt="" class="w-6 h-6 shrink-0 select-none" aria-hidden="true" draggable="false">
      <span class="text-[12px] font-semibold text-apjek-text whitespace-nowrap">보유 반짝이 : {{ sparkle }}</span>
    </button>

    <!-- 최초 로드 중 스켈레톤 — 데이터가 오기 전까지 화면 아래가 비지 않게 -->
    <CommonLoading v-if="pending" variant="skeleton" />

    <!-- 육성 개체 (GET /growth) — 정령만 노출(§4-11: 판타지 식물은 데이터 유지, UI 숨김) -->
    <template v-else>
      <section v-for="c in items" :key="c.speciesCode" class="space-y-[14px]">
        <!-- G3 30 달성 배너 (달성일 하루 유지 — 카드형 상단 토스트 대체)
             TODO(C4 머지 후): useToast({title, description, variant:'card'}) 로 교체 검토 -->
        <div
          v-if="isComplete(c) && showCompleteBanner(c)"
          class="rounded-[16px] bg-apjek-surface border border-apjek-border px-[16px] py-[14px] flex items-center gap-[12px]"
          role="status"
        >
          <span class="w-[40px] h-[40px] rounded-full bg-apjek-sparkle-bg flex items-center justify-center text-[20px] shrink-0" aria-hidden="true">🎉</span>
          <div class="min-w-0">
            <p class="text-[15px] font-bold text-apjek-text tracking-[-0.3px]">{{ c.goal }}개 달성! 정령을 획득했어요</p>
            <p class="mt-[2px] text-[12px] text-apjek-text-sub tracking-[-0.2px]">획득한 정령을 나의 테라에 배치할 수 있어요</p>
          </div>
        </div>

        <!-- 30 달성: 성공 카드 -->
        <div
          v-if="isComplete(c)"
          class="apjek-card rounded-[20px] px-[24px] py-[26px] flex flex-col items-center text-center"
        >
          <p class="text-[18px] font-bold text-apjek-text tracking-[-0.4px]">{{ stageOf(c).label }} 키우기 성공!</p>
          <p class="mt-[6px] text-[12px] text-apjek-text-sub tracking-[-0.2px]">
            획득한 정령을 나의 테라에 배치할 수 있어요
          </p>
          <div class="relative mt-[14px] mb-[4px] flex items-center justify-center">
            <!-- 핑크 글로우 — 성공 연출 -->
            <span
              class="absolute -inset-[28px] rounded-full pointer-events-none"
              :style="{ background: 'radial-gradient(circle, rgba(251,147,207,0.35) 0%, rgba(251,147,207,0) 70%)' }"
            />
            <div class="relative">
              <GrowSpiritVisual :species-code="c.speciesCode" :name-ko="c.nameKo" :tier="stageOf(c).tier" />
            </div>
          </div>
          <!-- 관리 모드 바로가기 (댓글 #53: 관리모드 > 정령 탭 바로 이동) — 홈 딥링크 `/?mode=manage&tab=spirit` -->
          <button
            class="mt-[16px] h-[38px] px-[18px] rounded-full bg-[#a9c9d3] inline-flex items-center gap-[6px] text-[13px] font-semibold text-[#1f3d4d] transition-all active:scale-95"
            @click="onManage"
          >
            <Icon name="lucide:pencil" class="w-4 h-4" />
            관리 모드 바로가기
          </button>
        </div>

        <!-- G4 기록 끊김(LOST): 정령 자리 비움 + 안내 -->
        <div v-else-if="isLost(c)" class="flex flex-col items-center justify-center pt-[30px] pb-[16px] min-h-[230px]">
          <div class="w-[120px] h-[120px] rounded-full border-2 border-dashed border-white/50 flex items-center justify-center" aria-hidden="true">
            <span class="text-[34px] opacity-60">✨</span>
          </div>
          <p class="mt-[22px] text-[18px] font-bold text-white tracking-[-0.4px]">내일 새로운 정령이 찾아와요</p>
          <p class="mt-[4px] text-[12px] text-white/75 tracking-[-0.2px]">기록이 끊겨서 정령이 떠났어요</p>
          <!-- 되살리기 보류(revive-dismiss) 중에는 당일 재시도 없음 — 버튼 숨김 (댓글 #32) -->
          <button
            v-if="!isSnoozed(c)"
            type="button"
            class="mt-[14px] h-[34px] px-[16px] rounded-full bg-white/90 text-[12px] font-semibold text-apjek-text transition-all active:scale-95"
            @click="openLostModal(c)"
          >
            정령 다시 불러오기
          </button>
        </div>

        <!-- 진행 중: 씬 중앙 정령 일러스트 + 단계 라벨 (G2 — 도장 수 기준) -->
        <div v-else class="flex flex-col items-center pt-[30px] pb-[16px]">
          <GrowMysterySpirit v-if="stageOf(c).tier === 'mystery'" />
          <div
            v-else
            :class="stageOf(c).tier === 'stage1' ? 'scale-[0.85] origin-bottom' : ''"
          >
            <GrowSpiritVisual :species-code="c.speciesCode" :name-ko="c.nameKo" :tier="stageOf(c).tier" />
          </div>
          <p class="mt-[30px] text-[22px] font-bold text-white tracking-[-0.5px]">{{ stageOf(c).label }}</p>
        </div>

        <!-- 기록 끊김 시 도장판 + 하단 카드 일괄 흐림 + 터치 잠김(pointer-events none + grayscale) -->
        <div
          class="space-y-[14px] transition-[filter,opacity] duration-300"
          :class="isLost(c) ? 'grayscale opacity-60 blur-[1.5px] pointer-events-none select-none' : ''"
          :aria-disabled="isLost(c) ? 'true' : undefined"
        >
          <GrowStampBoard
            :progress="c.stampCount"
            :goal="c.goal"
            :dormant="isLost(c)"
            :complete="isComplete(c)"
            :flash="flashSpecies === c.speciesCode"
            kind-label="정령"
          />

          <!-- 30 달성: 다음 정령 안내 카드 (알림받기 — POST /growth/{speciesCode}/notify-next 토글) -->
          <div v-if="isComplete(c)" class="rounded-[20px] bg-[#47515c] px-[18px] py-[16px] flex items-center gap-[12px]">
            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold text-white tracking-[-0.3px]">새로운 정령이 내일 찾아와요</p>
              <p class="mt-[3px] text-[11px] text-white/70 tracking-[-0.2px]">
                새로운 수수께끼 정령이 도착하면 알려드려요
              </p>
            </div>
            <button
              class="shrink-0 h-[34px] px-[16px] rounded-full text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100"
              :class="c.notifyNext ? 'bg-white/25 text-white/80' : 'bg-[#ffffff] text-[#121212]'"
              :aria-pressed="c.notifyNext"
              :aria-label="c.notifyNext ? '다음 정령 도착 알림 신청 취소' : '다음 정령 도착 알림받기'"
              :disabled="notifyBusy === c.speciesCode"
              @click="onToggleNotify(c)"
            >
              {{ c.notifyNext ? '알림 신청됨' : '알림받기' }}
            </button>
          </div>

          <!-- G5 반짝이 교환 카드 (다크 카드 + 화이트 버튼) — API 계약은 기존 부스터 그대로 -->
          <div v-else class="rounded-[20px] bg-[#47515c] px-[16px] py-[14px] flex items-center gap-[12px]">
            <div class="w-[44px] h-[44px] rounded-[14px] bg-apjek-sparkle-bg flex items-center justify-center shrink-0">
              <IconSparkle color="#fb93cf" class="w-[26px] h-[26px]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold text-white tracking-[-0.3px]">반짝이 사용하기</p>
              <p class="mt-[2px] text-[11px] text-white/70 tracking-[-0.2px]">
                반짝이 {{ BOOSTER_COST }}개를 도장 {{ BOOSTER_STAMPS }}개로 교환해요
              </p>
            </div>
            <!-- 반짝이 부족 시엔 비활성 대신 탭 → 부족 안내 토스트 (onUse 의 사전 체크) -->
            <button
              class="shrink-0 h-[34px] px-[16px] rounded-full bg-[#ffffff] text-[13px] font-semibold text-[#121212] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              :disabled="boosting === c.speciesCode || isLost(c)"
              @click="onUse(c)"
            >
              교환하기
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- 실패 — "정령이 없다" 와 반드시 구분한다. 통신 오류를 빈 상태로 보여주면
         사용자는 키우던 개체가 사라진 줄 안다. -->
    <div v-if="!pending && loadFailed" class="flex flex-col items-center gap-3 py-10 text-white/85">
      <p class="text-[14px]">정보를 불러오지 못했어요</p>
      <button
        type="button"
        class="px-4 py-2 rounded-full bg-white text-apjek-text text-[13px] transition-all active:scale-95"
        @click="loadGrowth()"
      >
        다시 시도
      </button>
    </div>

    <!-- 빈 상태 — 로드가 성공했고 정말 0개일 때만 -->
    <div v-else-if="!pending && !items.length" class="text-center text-[14px] text-white/85 py-10">
      아직 키우는 정령이 없어요
    </div>

    <!-- G4 기록 끊김 모달 -->
    <GrowLostModal
      :open="lostModalSpecies !== null"
      :ruby="ruby"
      :ruby-cost="lostRubyCost"
      :busy="reviving"
      @close="closeLostModal"
      @revive="onRevive"
    />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useUserStore } from '~/stores/user'
import type { GrowthItem, GrowthResponse } from '@terraworld-it/openapi-frontend'
import {
  BOOSTER_COST,
  BOOSTER_STAMPS,
  isGrowthComplete,
  isGrowthLost,
  isReviveSnoozed,
  spiritStageOf,
  type SpiritStage,
} from '~/utils/grow'
import svgPaths from './grow-svg-paths'
// 키우기(Grow) 화면 — GET /growth 실 백엔드 배선 + SPARKLE 부스터(POST /growth/{speciesCode}/booster)
// + 되살리기(POST /growth/{speciesCode}/revive | revive-dismiss) + 알림받기(notify-next 토글).
// 디자인 SoT: 아프젝 v2 Figma(2026-08-21) 키우기 탭 — G2 단계 라벨 / G3 30 달성 / G4 기록 끊김 / G5b 교환 플래시 / G7 카피.
// 서버 계약(N-B6 rev2 R3): cycleState/stampCount/stages/completedToday/notifyNext/reviveRubyCost/reviveSnoozedUntil 가 SoT.
definePageMeta({ middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const userStore = useUserStore()

const sparkle = computed<number>(() => Math.floor(balanceOf(userStore.currency, 'SPARKLE')))
const ruby = computed<number>(() => Math.floor(balanceOf(userStore.currency, 'RUBY')))
const rawItems = ref<GrowthItem[]>([])
// §4-11: 키우기 탭에는 정령만 노출 — 판타지 식물(PLANT)은 응답에 남아 있어도 그리지 않는다.
const items = computed<GrowthItem[]>(() => rawItems.value.filter((c) => c.kind === 'SPIRIT'))
const boosting = ref<string | null>(null)

// 반짝이(sparkle) 아이콘 — TW2 IconSparkle (16x16 인라인 SVG)
function IconSparkle(props: { color?: string }) {
  const color = props.color ?? '#F092F0'
  return h('svg', { width: '16', height: '16', fill: 'none', viewBox: '0 0 16 16' }, [
    h('g', { clipPath: 'url(#sp_clip)' }, [
      h('path', { d: svgPaths.sparkleStar, stroke: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.33333' }),
      h('path', { d: 'M13.3333 2V4.66667', stroke: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.33333' }),
      h('path', { d: 'M14.6667 3.33333H12', stroke: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.33333' }),
      h('path', { d: 'M2.66667 11.3333V12.6667', stroke: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.33333' }),
      h('path', { d: 'M3.33333 12H2', stroke: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.33333' }),
    ]),
    h('defs', [h('clipPath', { id: 'sp_clip' }, [h('rect', { fill: 'white', width: '16', height: '16' })])]),
  ])
}

// ── 파생 판정 (utils/grow — 서버 cycleState / stages 가 SoT) ──
function isComplete(c: GrowthItem): boolean {
  return isGrowthComplete(c)
}
function isLost(c: GrowthItem): boolean {
  return isGrowthLost(c)
}
function isSnoozed(c: GrowthItem): boolean {
  return isReviveSnoozed(c)
}
// G2 단계 라벨 — 서버 stages[] 기준. 획득 라벨은 서버 nameKo.
function stageOf(c: GrowthItem): SpiritStage {
  return spiritStageOf(c)
}

// 서버 stage 변화 감지 → 진화/성장 토스트. 표시했으면 true — 교환 완료 토스트와 중복 방지용.
function notifyStageChange(prev: GrowthItem, next: GrowthItem): boolean {
  const before = stageOf(prev)
  const after = stageOf(next)
  if (before.tier === after.tier) return false
  if (after.tier === 'acquired') toast.success(`${after.label}을 획득했어요!`)
  else toast.success(`정령이 성장했어요! 이제 '${after.label}' 이에요`)
  return true
}

// ── G3: 30 달성 배너 "달성일 하루 유지" — 서버 completedToday ──
function showCompleteBanner(c: GrowthItem): boolean {
  return c.completedToday
}

/** 응답 개체로 해당 종만 교체(새 배열 재할당) */
function replaceItem(updated: GrowthItem): void {
  const idx = rawItems.value.findIndex((it) => it.speciesCode === updated.speciesCode)
  if (idx === -1) {
    rawItems.value = [...rawItems.value, updated]
    return
  }
  const copy = [...rawItems.value]
  copy[idx] = updated
  rawItems.value = copy
}

// ── G3: 알림받기 — POST /growth/{speciesCode}/notify-next (토글, 응답 GrowthItem) ──
const notifyBusy = ref<string | null>(null)
async function onToggleNotify(c: GrowthItem): Promise<void> {
  if (notifyBusy.value) return
  notifyBusy.value = c.speciesCode
  try {
    const { data, error } = await sdk.toggleGrowthNotifyNext({ client, path: { speciesCode: c.speciesCode } })
    if (error) {
      toast.error('알림 신청에 실패했어요')
      return
    }
    const updated = castData<GrowthItem>(data)
    if (updated) replaceItem(updated)
    toast.success(updated?.notifyNext === false ? '알림 신청을 취소했어요' : '알림을 신청했어요')
  }
  finally {
    notifyBusy.value = null
  }
}

// ── G4: 기록 끊김 모달 ──
const lostModalSpecies = ref<string | null>(null)
const reviving = ref<boolean>(false)
const lostItem = computed<GrowthItem | null>(() =>
  rawItems.value.find((it) => it.speciesCode === lostModalSpecies.value) ?? null)
const lostRubyCost = computed<number>(() => lostItem.value?.reviveRubyCost ?? 0)

function openLostModal(c: GrowthItem): void {
  lostModalSpecies.value = c.speciesCode
}
// 닫으면 당일 재시도 없음(댓글 #32) — POST revive-dismiss → reviveSnoozedUntil 설정, 다음날 새 사이클.
async function closeLostModal(): Promise<void> {
  const species = lostModalSpecies.value
  lostModalSpecies.value = null
  if (!species || reviving.value) return
  const { data, error } = await sdk.dismissGrowthRevive({ client, path: { speciesCode: species } })
  if (error) {
    // 보류 반영 실패는 표시 편의 문제 — 다음 조회/열기에서 다시 판단한다.
    return
  }
  const updated = castData<GrowthItem>(data)
  if (updated) replaceItem(updated)
}
function maybeOpenLostModal(list: GrowthItem[]): void {
  if (lostModalSpecies.value) return
  const target = list.find((c) => isLost(c) && !isSnoozed(c))
  if (target) lostModalSpecies.value = target.speciesCode
}

/** revive 공통 호출 — 성공 시 개체 교체 + 재화 재동기화, 실패는 코드별 안내 */
async function callRevive(speciesCode: string, body: { method: 'RUBY' | 'AD'; adNonce?: string }): Promise<boolean> {
  const { data, error } = await sdk.reviveGrowth({ client, path: { speciesCode }, body })
  if (error) {
    const code = errCode(error)
    if (code === 'INSUFFICIENT_FUNDS') toast.error('루비가 부족해요')
    else if (code === 'GROWTH_REVIVE_SNOOZED') toast.error('오늘은 다시 불러올 수 없어요 · 내일 새로운 정령이 찾아와요')
    else if (code === 'NONCE_ALREADY_CONSUMED') toast.error('이미 사용된 광고 보상이에요')
    else toast.error(errMsg(error, '정령을 다시 불러오지 못했어요'))
    await userStore.fetchMe(true) // 재화 재동기화 — TTL 캐시 무시
    return false
  }
  const updated = castData<GrowthItem>(data)
  if (updated) replaceItem(updated)
  lostModalSpecies.value = null
  await userStore.fetchMe(true) // 루비 차감 반영 — TTL 캐시 무시
  toast.success('정령이 돌아왔어요! 이어서 기록해요')
  return true
}

async function onRevive(method: 'RUBY' | 'AD'): Promise<void> {
  const species = lostModalSpecies.value
  if (!species || reviving.value) return
  reviving.value = true
  try {
    if (method === 'RUBY') {
      await callRevive(species, { method: 'RUBY' })
      return
    }
    // AD — 기존 보상형 광고 플로우(useAdMob) 재사용: Android 네이티브에서만 실 광고, 웹은 안내.
    const { isAndroid, showRewardedAd, generateNonce } = useAdMob()
    if (!isAndroid && !import.meta.dev) {
      toast.info('앱에서 이용할 수 있어요')
      return
    }
    const nonce = generateNonce()
    const watched = await showRewardedAd({ ssvUserId: userStore.me?.userId, ssvCustomData: nonce })
    if (!watched) {
      toast.info('광고를 끝까지 시청하면 정령을 다시 불러올 수 있어요')
      return
    }
    await callRevive(species, { method: 'AD', adNonce: nonce })
  }
  finally {
    reviving.value = false
  }
}

const pending = ref<boolean>(true)
const loadFailed = ref<boolean>(false)

async function loadGrowth(): Promise<void> {
  pending.value = true
  loadFailed.value = false
  try {
    // hey-api 클라이언트는 4xx/5xx 를 throw 하지 않고 `{error}` 로 resolve 한다.
    // 이걸 조용히 넘기면 네트워크 오류가 "키우는 개체 0개" 로 보여, 사용자는 자기 정령이
    // 사라진 줄 안다. 실패는 실패로 표시하고 재시도 버튼을 준다.
    const { data, error } = await sdk.getGrowth({ client })
    if (error) throw new Error(errMsg(error, 'getGrowth failed'))
    const next = castData<GrowthResponse>(data)?.items ?? []
    // 재로드 시(다른 탭에서 기록 등) 단계가 올라 있으면 성장 토스트. 최초 로드는 이전 상태가 없으므로 발화하지 않는다.
    if (rawItems.value.length) {
      const prevMap = new Map<string, GrowthItem>(rawItems.value.map((it) => [it.speciesCode, it]))
      for (const it of next) {
        const prev = prevMap.get(it.speciesCode)
        if (prev) notifyStageChange(prev, it)
      }
    }
    rawItems.value = next
    maybeOpenLostModal(next.filter((c) => c.kind === 'SPIRIT'))
  }
  catch (e) {
    loadFailed.value = true
    toast.error((e as Error).message)
  }
  finally {
    // 실패해도 스켈레톤을 영구히 남기지 않는다.
    pending.value = false
  }
}

onMounted(() => {
  // 콜드 진입(직접 URL/새로고침) 시 userStore.me 가 비어 있으면 보유 반짝이가 0 으로
  // 표시되는 정합 버그 방지. fetchMe 는 TTL fetchGuard 가 있어 홈 경유 진입 시 중복 비용 없음.
  void userStore.fetchMe()
  void loadGrowth()
})

function onSparkleInfo(): void {
  // 반짝이는 습관 7일 완주로 획득 — 습관 기록은 기록 페이지에 통합됨(낙서장: 습관 진입점).
  navigateTo('/record')
}

// 성공 카드 "관리 모드 바로가기" → 홈을 관리 모드 + 정령 탭으로 연다(utils/homeEntry 딥링크 계약).
function onManage(): void {
  void navigateTo({ path: '/', query: { mode: 'manage', tab: 'spirit' } })
}

// ── G5b: 교환 플래시 (도장판 카드 핑크 0.8초 후 흰색 복귀) ──
const flashSpecies = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null
function flashBoard(speciesCode: string): void {
  if (flashTimer) clearTimeout(flashTimer)
  flashSpecies.value = speciesCode
  flashTimer = setTimeout(() => {
    flashSpecies.value = null
    flashTimer = null
  }, 800)
}
onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
})

async function onUse(c: GrowthItem): Promise<void> {
  // SPARKLE 소비 → 부스터로 육성 진행 가속 (POST /growth/{speciesCode}/booster).
  if (boosting.value) return
  if (isLost(c)) {
    openLostModal(c)
    return
  }
  if (sparkle.value < BOOSTER_COST) {
    toast.error('반짝이가 부족해요')
    return
  }
  boosting.value = c.speciesCode
  try {
    const { data, error } = await sdk.buyGrowthBooster({ client, path: { speciesCode: c.speciesCode } })
    if (error) {
      // failure-path-first: 원인별 안내 + 잔액 재동기화
      const code = errCode(error)
      if (code === 'INSUFFICIENT_FUNDS') toast.error('반짝이가 부족해요')
      else if (code === 'GROWTH_DORMANT' || code === 'GROWTH_LOST') openLostModal(c)
      else toast.error('반짝이 사용에 실패했어요')
      await userStore.fetchMe(true) // 재화 재동기화 — TTL 캐시 무시
      return
    }
    const updated = castData<GrowthItem>(data)
    let stageToasted = false
    if (updated) {
      replaceItem(updated)
      // 부스터로 단계가 올랐으면 성장 토스트를 우선하고 교환 완료 토스트는 생략
      stageToasted = notifyStageChange(c, updated)
    }
    flashBoard(c.speciesCode)
    await userStore.fetchMe(true) // 반짝이 차감 반영 — TTL 캐시 무시
    // TODO(C4 머지 후): 상단 핑크 필 토스트(variant:'pill') 로 교체
    if (!stageToasted) toast.success(`반짝이 ${BOOSTER_COST}개를 사용하여 도장 ${BOOSTER_STAMPS}개를 채웠어요`)
  }
  finally {
    boosting.value = null
  }
}
</script>
