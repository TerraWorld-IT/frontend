<template>
  <!-- 아프젝 리스킨: 페이지 전체가 블루 그라디언트 씬(apjek-grow 토큰) — 레이아웃 main 의
       px-5 / 상단(세이프에어리어 포함) 패딩을 음수 마진으로 상쇄해 풀블리드로 칠하고,
       하단은 앱 배경색(apjek-bg)으로 페이드시켜 아래 흰 영역과 이어붙인다. -->
  <div
    class="-mx-5 px-5 pb-[24px] space-y-[16px]"
    :style="{
      marginTop: 'calc(-1rem - env(safe-area-inset-top, 0px))',
      paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
      background: 'linear-gradient(180deg, var(--color-apjek-grow-from) 0%, var(--color-apjek-grow-to) 58%, var(--color-apjek-bg) 100%)',
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
      <span class="w-6 h-6 rounded-full bg-apjek-sparkle-bg flex items-center justify-center shrink-0">
        <IconSparkle color="#fb93cf" />
      </span>
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
              <GrowSpiritVisual :species-code="c.speciesCode" :name-ko="c.nameKo" />
            </div>
          </div>
          <!-- 관리 모드 바로가기 (댓글 #53: 관리모드 > 정령 탭 바로 이동)
               TODO(T13 홈 에이전트 관리모드 딥링크 계약 후): 정령 탭 직행 쿼리 연결 -->
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
          <button
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
            <GrowSpiritVisual :species-code="c.speciesCode" :name-ko="c.nameKo" />
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
            :progress="stampsOf(c)"
            :goal="c.goal"
            :dormant="isLost(c)"
            :complete="isComplete(c)"
            :flash="flashSpecies === c.speciesCode"
            kind-label="정령"
          />

          <!-- 30 달성: 다음 정령 안내 카드 (알림받기 — notify-next API 미존재, 로컬 플래그) -->
          <div v-if="isComplete(c)" class="rounded-[20px] bg-[#47515c] px-[18px] py-[16px] flex items-center gap-[12px]">
            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold text-white tracking-[-0.3px]">새로운 정령이 내일 찾아와요</p>
              <p class="mt-[3px] text-[11px] text-white/70 tracking-[-0.2px]">
                새로운 수수께끼 정령이 도착하면 알려드려요
              </p>
            </div>
            <button
              class="shrink-0 h-[34px] px-[16px] rounded-full text-[13px] font-semibold transition-all active:scale-95 disabled:active:scale-100"
              :class="isNotifyRequested(c) ? 'bg-white/25 text-white/80' : 'bg-[#ffffff] text-[#121212]'"
              :disabled="isNotifyRequested(c)"
              @click="onNotifyMe(c)"
            >
              {{ isNotifyRequested(c) ? '알림 신청됨' : '알림받기' }}
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
import type { GrowthResponse } from '@terraworld-it/openapi-frontend'
import {
  BOOSTER_COST,
  BOOSTER_STAMPS,
  REVIVE_RUBY_COST_DEFAULT,
  SPIRIT_ACQUIRED_LABEL,
  isGrowthComplete,
  isGrowthLost,
  localDateKey,
  resolveSpiritStage,
  stampCountOf,
  type GrowthItemV2,
  type SpiritStage,
} from '~/utils/grow'
import svgPaths from './grow-svg-paths'
// 키우기(Grow) 화면 — GET /growth 실 백엔드 배선 + SPARKLE 부스터(POST /growth/{speciesCode}/booster).
// 디자인 SoT: 아프젝 v2 Figma(2026-08-21) 키우기 탭 — G2 단계 라벨 / G3 30 달성 / G4 기록 끊김 / G5b 교환 플래시 / G7 카피.
// 서버 계약(N-B6: cycleState/revive/notify-next/stages) 은 스펙·백엔드 미구현 — 현행 SDK 로 동작하고
// 새 필드는 GrowthItemV2 선택 필드 + 안전 폴백으로 읽는다.
definePageMeta({ middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const userStore = useUserStore()

const sparkle = computed<number>(() => Math.floor(balanceOf(userStore.currency, 'SPARKLE')))
const ruby = computed<number>(() => Math.floor(balanceOf(userStore.currency, 'RUBY')))
const rawItems = ref<GrowthItemV2[]>([])
// §4-11: 키우기 탭에는 정령만 노출 — 판타지 식물(PLANT)은 응답에 남아 있어도 그리지 않는다.
const items = computed<GrowthItemV2[]>(() => rawItems.value.filter((c) => c.kind === 'SPIRIT'))
const boosting = ref<string | null>(null)

// 로컬 저장 키 (달성일 하루 유지 / 알림받기 / 끊김 모달 당일 닫힘)
const LS_COMPLETED_AT = 'tw:grow:completedAt:'
const LS_NOTIFY_NEXT = 'tw:grow:notifyNext:'
const LS_LOST_DISMISSED = 'tw:grow:lostDismissed:'

function lsGet(key: string): string | null {
  if (!import.meta.client) return null
  try { return localStorage.getItem(key) }
  catch { return null }
}
function lsSet(key: string, value: string): void {
  if (!import.meta.client) return
  try { localStorage.setItem(key, value) }
  catch { /* 사파리 프라이빗 모드 등 — 표시 편의 기능이라 무시 */ }
}

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

// ── 파생 판정 (utils/grow — 서버 신규 필드 우선, 없으면 현행 필드 폴백) ──
function stampsOf(c: GrowthItemV2): number {
  return stampCountOf(c)
}
function isComplete(c: GrowthItemV2): boolean {
  return isGrowthComplete(c)
}
function isLost(c: GrowthItemV2): boolean {
  return isGrowthLost(c)
}
// G2 단계 라벨 — 서버 stages[] 우선, 없으면 FE 임계(10/20/30). 획득 라벨은 서버 nameKo.
// TODO(G2 시드 변경 후 서버값 단일화): stageLabel/stages 가 Figma 라벨로 바뀌면 FE 임계 제거.
function stageOf(c: GrowthItemV2): SpiritStage {
  return resolveSpiritStage(stampsOf(c), c.goal, c.stages, c.nameKo || SPIRIT_ACQUIRED_LABEL)
}

// 서버 stage 변화 감지 → 진화/성장 토스트. 표시했으면 true — 교환 완료 토스트와 중복 방지용.
function notifyStageChange(prev: GrowthItemV2, next: GrowthItemV2): boolean {
  const before = stageOf(prev)
  const after = stageOf(next)
  if (before.tier === after.tier) return false
  if (after.tier === 'acquired') toast.success(`${after.label}을 획득했어요!`)
  else toast.success(`정령이 성장했어요! 이제 '${after.label}' 이에요`)
  return true
}

// ── G3: 30 달성 배너 "달성일 하루 유지" ──
// 서버 completedToday 가 있으면 그것을, 없으면 달성을 처음 본 날짜를 로컬에 적어 두고 당일만 보여 준다.
const completedAtMap = ref<Record<string, string>>({})
function showCompleteBanner(c: GrowthItemV2): boolean {
  if (typeof c.completedToday === 'boolean') return c.completedToday
  return completedAtMap.value[c.speciesCode] === localDateKey()
}
function rememberCompletion(list: GrowthItemV2[]): void {
  const today = localDateKey()
  for (const c of list) {
    if (!isComplete(c)) continue
    const key = LS_COMPLETED_AT + c.speciesCode
    let stored = lsGet(key)
    if (!stored) {
      stored = today
      lsSet(key, today)
    }
    completedAtMap.value[c.speciesCode] = stored
  }
}

// ── G3: 알림받기 (notify-next API 미존재 → 로컬 플래그) ──
// TODO(notify-next): POST /growth/{speciesCode}/notify-next 머지 후 서버 토글 + notifyNext 응답으로 교체.
const notifyMap = ref<Record<string, boolean>>({})
function isNotifyRequested(c: GrowthItemV2): boolean {
  if (typeof c.notifyNext === 'boolean') return c.notifyNext
  return notifyMap.value[c.speciesCode] === true
}
function onNotifyMe(c: GrowthItemV2): void {
  notifyMap.value[c.speciesCode] = true
  lsSet(LS_NOTIFY_NEXT + c.speciesCode, '1')
  toast.success('알림을 신청했어요')
}

// ── G4: 기록 끊김 모달 ──
const lostModalSpecies = ref<string | null>(null)
const reviving = ref<boolean>(false)
const lostRubyCost = computed<number>(() => {
  const c = rawItems.value.find((it) => it.speciesCode === lostModalSpecies.value)
  return c?.reviveRubyCost ?? REVIVE_RUBY_COST_DEFAULT
})
function openLostModal(c: GrowthItemV2): void {
  lostModalSpecies.value = c.speciesCode
}
function closeLostModal(): void {
  // 닫으면 당일은 다시 띄우지 않는다(댓글 #32: 닫힌 뒤 "내일 찾아와요" 화면).
  if (lostModalSpecies.value) lsSet(LS_LOST_DISMISSED + lostModalSpecies.value, localDateKey())
  lostModalSpecies.value = null
}
function maybeOpenLostModal(list: GrowthItemV2[]): void {
  if (lostModalSpecies.value) return
  const today = localDateKey()
  const target = list.find((c) => isLost(c) && lsGet(LS_LOST_DISMISSED + c.speciesCode) !== today)
  if (target) lostModalSpecies.value = target.speciesCode
}
function onRevive(method: 'RUBY' | 'AD'): void {
  // TODO(revive): POST /growth/{speciesCode}/revive {method: RUBY|AD, adNonce?} 스펙(N-B6) 머지 후 실호출.
  // 현재는 API 가 없어 임시 안내만 띄운다 — 재화 차감·광고 호출은 하지 않는다.
  void method
  toast.info('곧 지원돼요')
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
    const next = (castData<GrowthResponse>(data)?.items ?? []) as GrowthItemV2[]
    // 재로드 시(다른 탭에서 기록 등) 단계가 올라 있으면 성장 토스트. 최초 로드는 이전 상태가 없으므로 발화하지 않는다.
    if (rawItems.value.length) {
      const prevMap = new Map<string, GrowthItemV2>(rawItems.value.map((it) => [it.speciesCode, it]))
      for (const it of next) {
        const prev = prevMap.get(it.speciesCode)
        if (prev) notifyStageChange(prev, it)
      }
    }
    rawItems.value = next
    const spirits = next.filter((c) => c.kind === 'SPIRIT')
    rememberCompletion(spirits)
    for (const c of spirits) {
      if (lsGet(LS_NOTIFY_NEXT + c.speciesCode) === '1') notifyMap.value[c.speciesCode] = true
    }
    maybeOpenLostModal(spirits)
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

// 성공 카드 "관리 모드 바로가기" → 나의 테라(홈)
function onManage(): void {
  void navigateTo('/')
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

async function onUse(c: GrowthItemV2): Promise<void> {
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
      // (SDK error 타입은 loose 하나 런타임은 _Error{code} — unknown-guard 로 안전 추출)
      const code = (error as unknown as { code?: string } | null)?.code
      if (code === 'INSUFFICIENT_FUNDS') toast.error('반짝이가 부족해요')
      else if (code === 'GROWTH_DORMANT' || code === 'GROWTH_LOST') openLostModal(c)
      else toast.error('반짝이 사용에 실패했어요')
      await userStore.fetchMe(true) // 재화 재동기화 — TTL 캐시 무시
      return
    }
    const updated = castData<GrowthItemV2>(data)
    let stageToasted = false
    if (updated) {
      const idx = rawItems.value.findIndex((it) => it.speciesCode === updated.speciesCode)
      if (idx !== -1) rawItems.value[idx] = updated
      rememberCompletion([updated])
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
