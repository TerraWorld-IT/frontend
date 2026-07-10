<template>
  <div class="space-y-[30px] pb-4">
    <!-- 헤더 -->
    <div class="py-[10px]">
      <h1 class="font-bold text-[29px] text-black tracking-[-0.9px] leading-[28px]">키우기</h1>
      <div class="mt-[10px] text-[14px] text-[#525252] tracking-[-0.3px]">
        <p class="leading-[20px]">30일 동안 꾸준히 기록해서 정령과 판타지 식물을 키워요</p>
        <p class="leading-[20px]">반짝이로 빠르게 키울 수 있어요</p>
      </div>
    </div>

    <!-- 반짝이 + 도감 -->
    <div class="flex items-center justify-between">
      <button
        class="h-[40px] rounded-[16px] flex items-center gap-[6px] px-[12px]"
        :style="{ background: 'rgba(240,146,240,0.15)' }"
        @click="onSparkleInfo"
      >
        <IconSparkle color="#F092F0" />
        <span class="text-[12px] font-semibold text-[#f092f0]">보유 반짝이 : {{ sparkle }}</span>
      </button>
      <button
        class="h-[40px] rounded-[16px] px-[12px] text-[12px] font-semibold text-[#3a9e78] transition-all active:scale-95"
        :style="{ background: 'rgba(126,219,192,0.18)' }"
        @click="onDex"
      >
        도감
      </button>
    </div>

    <!-- 최초 로드 중에는 카드 자리에 스켈레톤을 둔다. 이전엔 헤더만 즉시 렌더되고 카드가
         나중에 튀어나와, 데이터가 오기 전까지 화면 아래가 비어 있었다.
         `v-else` 는 `v-for` 와 같은 엘리먼트에 둘 수 없어(Vue 3 는 v-if 가 v-for 보다 우선)
         template 으로 감싼다. -->
    <CommonLoading v-if="pending" variant="skeleton" />

    <!-- 육성 개체 카드 (GET /growth) -->
    <template v-else>
      <div
        v-for="c in items"
        :key="c.speciesCode"
        class="w-full rounded-[20px] overflow-hidden relative flex flex-col items-center justify-between gap-[24px]"
        :class="c.kind === 'SPIRIT' ? 'py-[24px]' : 'py-[13px]'"
        :style="{ background: bgOf(c.kind), border: '1px solid #fdf9e9', minHeight: '384px' }"
      >
      <!-- 진행 바 -->
      <div class="w-full px-[21px]">
        <div class="flex items-start justify-between mb-[6px]">
          <span class="text-[10px] tracking-[0.117px] text-[#e4f38d]">
            연속 기록 실천 {{ c.effectiveProgress }}/{{ c.goal }}일{{ c.dormant ? ' · 잠들었어요' : '' }}
          </span>
          <span class="text-[10px] tracking-[0.117px] text-[#e4f38d]">
            {{ c.goal }}일 달성 시 {{ c.kind === 'SPIRIT' ? '정령' : '판타지 식물' }} 획득
          </span>
        </div>
        <div class="h-[6px] w-full rounded-full overflow-hidden" :style="{ background: 'rgba(151,168,241,0.15)' }">
          <div
            class="h-full rounded-full transition-all duration-[600ms] ease-out"
            :style="{ width: `${Math.min(100, (c.effectiveProgress / c.goal) * 100)}%`, background: 'linear-gradient(90deg,#97a8f1,#c4a0f0)' }"
          />
        </div>
      </div>

      <!-- 개체 비주얼: 알려진 종(speciesCode)은 인라인 SVG(TW2), 그 외 종은 asset(gif) fallback -->
      <div class="flex items-center justify-center">
        <div :class="c.dormant ? 'grayscale opacity-60' : ''">
          <CatSpirit v-if="c.speciesCode === 'cat'" class="animate-float" />
          <TomatoVine v-else-if="c.speciesCode === 'tomato-vine'" class="animate-sway" />
          <img
            v-else
            :src="itemAssetUrl(c.speciesCode, 'gif')"
            :alt="c.nameKo"
            class="w-[140px] h-[140px] object-contain animate-float"
            @error="onAssetError"
          >
        </div>
      </div>

      <!-- 하단: LV + 이름 + 사용 버튼 -->
      <div class="w-full px-[21px] flex items-center justify-between">
        <div class="flex items-center gap-[24px]">
          <span class="text-[24px] font-semibold text-white">LV.{{ c.currentStage }}</span>
          <span class="text-[24px] font-semibold text-white">{{ c.nameKo }}</span>
        </div>
        <div class="flex flex-col items-end gap-[4px]">
          <button
            class="h-[40px] rounded-[16px] flex items-center gap-[6px] px-[12px] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            :style="{ background: 'rgba(126,219,192,0.18)' }"
            :disabled="boosting === c.speciesCode || c.dormant || sparkle < BOOSTER_COST"
            @click="onUse(c)"
          >
            <IconSparkle color="#E4F38D" />
            <span class="text-[12px] font-semibold text-[#e4f38d]">사용</span>
          </button>
          <span v-if="!c.dormant && sparkle < BOOSTER_COST" class="text-[10px] tracking-[0.117px] text-[#e4f38d]">
            반짝이 {{ BOOSTER_COST }} 필요
          </span>
        </div>
      </div>
      </div>
    </template>

    <!-- 실패 — "정령이 없다" 와 반드시 구분한다. 통신 오류를 빈 상태로 보여주면
         사용자는 키우던 개체가 사라진 줄 안다. -->
    <div v-if="!pending && loadFailed" class="flex flex-col items-center gap-3 py-10 text-neutral-400">
      <p class="text-[14px]">정보를 불러오지 못했어요</p>
      <button
        type="button"
        class="px-4 py-2 rounded-full bg-black text-white text-[13px]"
        @click="loadGrowth()"
      >
        다시 시도
      </button>
    </div>

    <!-- 빈 상태 — 로드가 성공했고 정말 0개일 때만. 이전엔 `!items.length` 만 보고
         "불러오는 중…" 을 띄워, 개체가 0개일 때도 영원히 로딩 중인 것처럼 보였다. -->
    <div v-else-if="!pending && !items.length" class="text-center text-[14px] text-neutral-400 py-10">
      아직 키우는 정령이 없어요
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useUserStore } from '~/stores/user'
import type { GrowthItem, GrowthResponse } from '@terraworld-it/openapi-frontend'
import svgPaths from './grow-svg-paths'
// 낙서장 리팩토링 req 1/3: 키우기(Grow) 화면 — GET /growth 실 백엔드 배선 + SPARKLE 부스터(POST /growth/{speciesCode}/booster).
// 디자인 SoT: TERRAWORLD2 프로토타입 Grow.tsx 픽셀-정확 재현.
definePageMeta({ middleware: 'auth' })

const { itemAssetUrl, onAssetError } = useItemAsset()
const { sdk, client } = useOpenApi()
const toast = useToast()
const userStore = useUserStore()

// 부스터 1회 = SPARKLE 100 소비 (계약 SoT: POST /growth/{speciesCode}/booster — 잔액 부족 시 INSUFFICIENT_FUNDS)
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

// 고양이 정령 SVG (TW2 CatSpirit — 156x173)
function CatSpirit() {
  const fills: Array<[keyof typeof svgPaths, string]> = [
    ['catP28731100', '#E4F38D'], ['catP210eb880', '#F092F0'], ['catP12c5e640', 'white'],
    ['catPda8c400', 'white'], ['catP20eec380', '#518CDB'], ['catP328090c0', '#518CDB'],
    ['catP3e9f2b00', '#518CDB'], ['catP2a208300', '#518CDB'], ['catPfd4dd80', 'white'],
    ['catP1821ca80', 'white'], ['catP2fb53600', 'white'], ['catP2e98e600', '#F092F0'],
    ['catP9413980', '#F092F0'], ['catP37730280', '#518CDB'], ['catP3e4c5a00', '#518CDB'],
    ['catP29ba5af0', '#518CDB'], ['catPb833580', '#518CDB'], ['catP9d12f00', 'white'],
    ['catP338c56f0', '#F092F0'], ['catP28d94780', 'white'], ['catPc4b6ec0', '#F092F0'],
  ]
  return h('svg', { width: '156', height: '173', fill: 'none', viewBox: '0 0 156 173' }, [
    h('g', { clipPath: 'url(#cat_clip)' }, fills.map(([k, f]) => h('path', { key: k, d: svgPaths[k], fill: f }))),
    h('defs', [h('clipPath', { id: 'cat_clip' }, [h('rect', { fill: 'white', width: '156', height: '173' })])]),
  ])
}

// 토마토 덩굴 SVG (TW2 TomatoVine — 164x172)
function TomatoVine() {
  const fills: Array<[keyof typeof svgPaths, string]> = [
    ['tomP224de780', '#53EA94'], ['tomP1e597f00', '#62E051'], ['tomP1f2a8100', '#62E051'],
    ['tomP17f437f2', '#E4F38D'], ['tomP158f0240', '#62E051'], ['tomP16d82340', '#E4F38D'],
    ['tomP12cb9100', '#2E6C52'], ['tomP2529ff30', '#2E6C52'],
  ]
  return h('svg', { width: '164', height: '172', fill: 'none', viewBox: '0 0 163.748 171.467' },
    fills.map(([k, f]) => h('path', { key: k, d: svgPaths[k], fill: f })),
  )
}

function bgOf(kind: GrowthItem['kind']): string {
  return kind === 'SPIRIT' ? '#518cdb' : '#f092f0'
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
    items.value = castData<GrowthResponse>(data)?.items ?? []
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
  void loadGrowth()
})

function onSparkleInfo(): void {
  // 반짝이는 습관 7일 완주로 획득 — 습관 기록은 기록 페이지에 통합됨(낙서장: 습관 진입점).
  navigateTo('/record')
}

function onDex(): void {
  toast.info('도감 기능은 준비중입니다 🚀')
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
      else toast.error('반짝이 사용에 실패했어요')
      await userStore.fetchMe(true) // 재화 재동기화 — TTL 캐시 무시
      return
    }
    const updated = castData<GrowthItem>(data)
    if (updated) {
      const idx = items.value.findIndex((it) => it.speciesCode === updated.speciesCode)
      if (idx !== -1) items.value[idx] = updated
    }
    await userStore.fetchMe(true) // 반짝이 차감 반영 — TTL 캐시 무시
    toast.success(`${c.nameKo}가 반짝이로 쑥 자랐어요 ✨`)
  }
  finally {
    boosting.value = null
  }
}
</script>
