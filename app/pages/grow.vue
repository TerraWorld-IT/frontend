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
    <!-- 헤더 -->
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

    <!-- 육성 개체 (GET /growth) — 종별로 씬 + 도장판 + 하단 카드 세트 -->
    <template v-else>
      <section v-for="c in items" :key="c.speciesCode" class="space-y-[14px]">
        <!-- 30 달성: 성공 카드 (fig-grow 우측 상태) -->
        <div
          v-if="isComplete(c)"
          class="apjek-card rounded-[20px] px-[24px] py-[26px] flex flex-col items-center text-center"
        >
          <p class="text-[18px] font-bold text-apjek-text tracking-[-0.4px]">{{ kindLabelOf(c) }} 키우기 성공!</p>
          <p class="mt-[6px] text-[12px] text-apjek-text-sub tracking-[-0.2px]">
            획득한 {{ kindLabelOf(c) }}을 나의 테라에 배치할 수 있어요
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
          <button
            class="mt-[16px] h-[38px] px-[18px] rounded-full bg-[#a9c9d3] inline-flex items-center gap-[6px] text-[13px] font-semibold text-[#1f3d4d] transition-all active:scale-95"
            @click="onManage"
          >
            <Icon name="lucide:pencil" class="w-4 h-4" />
            관리 모드 바로가기
          </button>
        </div>

        <!-- 진행 중: 씬 중앙 정령 일러스트 + 이름 -->
        <div v-else class="flex flex-col items-center pt-[30px] pb-[16px]">
          <div :class="c.dormant ? 'grayscale opacity-60' : ''">
            <GrowSpiritVisual :species-code="c.speciesCode" :name-ko="c.nameKo" />
          </div>
          <p class="mt-[30px] text-[22px] font-bold text-white tracking-[-0.5px]">{{ c.nameKo }}</p>
        </div>

        <!-- 동면 시 도장판 + 하단 카드 일괄 잠금(grayscale) — 터치하면 안내 토스트 -->
        <div
          class="space-y-[14px]"
          :class="c.dormant ? 'grayscale opacity-60' : ''"
          @click="onZoneTap(c)"
        >
          <GrowStampBoard
            :progress="c.effectiveProgress"
            :goal="c.goal"
            :dormant="c.dormant"
            :complete="isComplete(c)"
            :kind-label="kindLabelOf(c)"
          />

          <!-- 30 달성: 다음 개체 안내 카드 (알림받기 — 백엔드 미구현, 준비 중 토스트) -->
          <div v-if="isComplete(c)" class="rounded-[20px] bg-[#47515c] px-[18px] py-[16px] flex items-center gap-[12px]">
            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold text-white tracking-[-0.3px]">새로운 {{ kindLabelOf(c) }}이 내일 찾아와요</p>
              <p class="mt-[3px] text-[11px] text-white/70 tracking-[-0.2px]">
                {{ c.kind === 'SPIRIT' ? '새로운 수수께끼 정령이 도착하면 알려드려요' : '새로운 판타지 식물이 도착하면 알려드려요' }}
              </p>
            </div>
            <button
              class="shrink-0 h-[34px] px-[16px] rounded-full bg-[#ffffff] text-[13px] font-semibold text-[#121212] transition-all active:scale-95"
              @click="onNotifyMe"
            >
              알림받기
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
                반짝이 {{ BOOSTER_COST }}개를 도장 10개로 교환해요
              </p>
            </div>
            <!-- 반짝이 부족 시엔 비활성 대신 탭 → 부족 안내 토스트 (onUse 의 사전 체크).
                 동면 시엔 pointer-events 를 꺼서 탭이 래퍼(onZoneTap 토스트)로 통과되게 한다. -->
            <button
              class="shrink-0 h-[34px] px-[16px] rounded-full bg-[#ffffff] text-[13px] font-semibold text-[#121212] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              :class="c.dormant ? 'pointer-events-none' : ''"
              :disabled="boosting === c.speciesCode || c.dormant"
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
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useUserStore } from '~/stores/user'
import type { GrowthItem, GrowthResponse } from '@terraworld-it/openapi-frontend'
import svgPaths from './grow-svg-paths'
// 키우기(Grow) 화면 — GET /growth 실 백엔드 배선 + SPARKLE 부스터(POST /growth/{speciesCode}/booster).
// 디자인 SoT: 아프젝 리디자인 fig-grow 상태 매트릭스 (G1 도장판 + G5 교환 카드).
definePageMeta({ middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const userStore = useUserStore()

// 부스터 1회 = SPARKLE 100 소비 → 도장 +10 (계약 SoT: POST /growth/{speciesCode}/booster — 잔액 부족 시 INSUFFICIENT_FUNDS)
const BOOSTER_COST = 100

const sparkle = computed<number>(() => Math.floor(balanceOf(userStore.currency, 'SPARKLE')))
const items = ref<GrowthItem[]>([])
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

// 30 달성(성공 상태) 판정 — goal 은 서버 값(하드코딩 금지)
function isComplete(c: GrowthItem): boolean {
  return c.goal > 0 && c.effectiveProgress >= c.goal
}

function kindLabelOf(c: GrowthItem): string {
  return c.kind === 'SPIRIT' ? '정령' : '판타지 식물'
}

// 서버 stage 변화 감지 → 진화/성장 토스트 (fig-grow 상태 매트릭스 카피 정합).
// 이름이 바뀌면 "진화", 아니면 "성장". 표시했으면 true — 교환 완료 토스트와 중복 방지용.
function notifyStageChange(prev: GrowthItem, next: GrowthItem): boolean {
  if (next.currentStage <= prev.currentStage) return false
  if (next.nameKo !== prev.nameKo) toast.success(`${prev.nameKo}이 '${next.nameKo}' 으로 진화했어요`)
  else toast.success(`${kindLabelOf(next)}이 성장했어요! 곧 ${kindLabelOf(next)}을 획득할 수 있어요`)
  return true
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
    // 재로드 시(다른 탭에서 기록 등) stage 가 올라 있으면 진화/성장 토스트.
    // 최초 로드는 이전 상태가 없으므로 발화하지 않는다.
    if (items.value.length) {
      const prevMap = new Map<string, GrowthItem>(items.value.map((it) => [it.speciesCode, it]))
      for (const it of next) {
        const prev = prevMap.get(it.speciesCode)
        if (prev) notifyStageChange(prev, it)
      }
    }
    items.value = next
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

// 동면 잠금 영역 터치 — 기존 안내 토스트 유지
function onZoneTap(c: GrowthItem): void {
  if (c.dormant) toast.error('잠든 개체는 먼저 기록으로 깨워야 해요')
}

// 성공 카드 "관리 모드 바로가기" → 나의 테라(홈)
function onManage(): void {
  void navigateTo('/')
}

// "알림받기" — 백엔드 미구현, 준비 중 안내
function onNotifyMe(): void {
  toast.info('알림 기능은 준비중이에요 🔔')
}

async function onUse(c: GrowthItem): Promise<void> {
  // SPARKLE 소비 → 부스터로 육성 진행 가속 (POST /growth/{speciesCode}/booster).
  if (boosting.value) return
  if (c.dormant) {
    toast.error('잠든 개체는 먼저 기록으로 깨워야 해요')
    return
  }
  if (sparkle.value < BOOSTER_COST) {
    toast.error(`반짝이 ${BOOSTER_COST} 필요 · 습관 7일 완주로 모아보세요`)
    return
  }
  boosting.value = c.speciesCode
  try {
    const { data, error } = await sdk.buyGrowthBooster({ client, path: { speciesCode: c.speciesCode } })
    if (error) {
      // failure-path-first: 원인별 안내 + 잔액 재동기화
      // (SDK error 타입은 loose 하나 런타임은 _Error{code} — unknown-guard 로 안전 추출)
      const code = (error as unknown as { code?: string } | null)?.code
      if (code === 'INSUFFICIENT_FUNDS') toast.error(`반짝이 ${BOOSTER_COST} 필요 · 습관 7일 완주로 모아보세요`)
      else if (code === 'GROWTH_DORMANT') toast.error('잠든 개체는 먼저 기록으로 깨워야 해요')
      else toast.error('반짝이 사용에 실패했어요')
      await userStore.fetchMe(true) // 재화 재동기화 — TTL 캐시 무시
      return
    }
    const updated = castData<GrowthItem>(data)
    let stageToasted = false
    if (updated) {
      const idx = items.value.findIndex((it) => it.speciesCode === updated.speciesCode)
      if (idx !== -1) items.value[idx] = updated
      // 부스터로 stage 가 올랐으면 진화/성장 토스트를 우선하고 교환 완료 토스트는 생략
      stageToasted = notifyStageChange(c, updated)
    }
    await userStore.fetchMe(true) // 반짝이 차감 반영 — TTL 캐시 무시
    if (!stageToasted) toast.success('반짝이 사용 완료! 도장 10개가 채워졌어요')
  }
  finally {
    boosting.value = null
  }
}
</script>
