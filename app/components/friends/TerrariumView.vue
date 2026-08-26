<!--
  친구 테라리움 읽기 전용 렌더 — 홈(pages/index.vue)의 400×552 스테이지 수식을 그대로 재구성.
  - 스테이지는 설계 기준 400×552 를 shrink-0 로 유지하고 uniform scale(stageFit)로만 축소한다
    (홈과 동일 — flex 축소로 폭만 줄면 %-inset 병 아트가 세로로 왜곡됨).
  - 배치 소스 2경로:
    1) 응답에 optional `freePlacements`(FreePlacementItem — posX/posY 비율·scale·flipped·zIndex)가
       있으면 실좌표로 재현 — 홈 applySnapshot 과 동일 해석(posX×400/posY×552 + clamp,
       비자유배치 항목은 index 폴백).
    2) 없으면(백엔드 미탑재/자유배치 미사용) slot 기반 placedItems 를 홈의 결정적 폴백 좌표
       (DEFAULT_POSITIONS)에 배치.
    읽기 전용 — 드래그/편집 없음.
  - 아이템 이미지 분기(isUrl → img w-24 h-24 / 이모지 text-4xl), 내부 wrapper 의
    scale/scaleX(flip) transform, zIndex(10+depth), isAnimated 부유 애니메이션도 홈 수식과 동일.
-->
<template>
  <div ref="stageEl" class="relative flex justify-center w-full overflow-hidden">
    <div
      class="relative shrink-0"
      :style="{
        transform: `scale(${stageFit})`,
        transformOrigin: 'top center',
        width: '400px',
        height: '552px',
        marginBottom: `${-552 * (1 - stageFit)}px`,
      }"
    >
      <!-- 유리병 — 홈과 동일한 병 아트(친구가 표시 중인 티어의 레벨). 질감 오버레이는 아이템 위. -->
      <TerrariumJarArt :level="jarLevel" layer="base" />
      <TerrariumJarArt :level="jarLevel" layer="texture" style="z-index: 5000" />

      <!-- 배치된 아이템들 (읽기 전용) -->
      <div
        v-for="item in renderItems"
        :key="item.id"
        class="absolute flex items-center justify-center select-none pointer-events-none"
        :class="item.isAnimated ? 'friend-item-float' : ''"
        :style="itemStyle(item)"
      >
        <!-- 내부 wrapper — 홈과 동일하게 scale/좌우반전을 여기서 합성 (외곽 박스는 좌표만 소유) -->
        <div
          class="relative flex items-center justify-center"
          :style="{ transform: `scale(${item.scale}) scaleX(${item.flipped ? -1 : 1})`, transformOrigin: 'center' }"
        >
          <img
            v-if="isUrl(item.image)"
            :src="item.image"
            :alt="item.name"
            class="w-24 h-24 object-contain"
            draggable="false"
          >
          <div v-else class="text-4xl">{{ item.image }}</div>
          <Icon
            v-if="item.isAnimated"
            name="lucide:sparkles"
            class="w-3 h-3 text-yellow-400 absolute -top-1 -right-1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TerrariumResponse } from '@terraworld-it/openapi-frontend'
import { levelOfTier } from '~/utils/tierLevels'

const props = defineProps<{
  terrarium: TerrariumResponse
}>()

// ─── 좌표계 (pages/index.vue 와 동일 상수) ───
// pages/index.vue 와 같은 값(96) — 홈과 친구 병의 아이템 크기가 같아야 한다.
const BASE_SIZE = 96
const HALF = BASE_SIZE / 2
const jarLevel = computed<number>(() => levelOfTier(props.terrarium.activeTier ?? props.terrarium.tier))
// 홈의 비자유배치 폴백 좌표 — EDIT 영역 안 8지점. 슬롯 기반 응답의 결정적 배치에 재사용.
const DEFAULT_POSITIONS = [
  { x: 140, y: 280 }, { x: 240, y: 260 }, { x: 105, y: 380 }, { x: 200, y: 390 },
  { x: 285, y: 365 }, { x: 168, y: 320 }, { x: 255, y: 335 }, { x: 118, y: 340 },
]

interface FriendRenderItem {
  id: number
  image: string
  name: string
  isAnimated: boolean
  x: number
  y: number
  scale: number
  flipped: boolean
  zIndex: number
}

const renderItems = computed<FriendRenderItem[]>(() => {
  // 경로 1: 실좌표 (freePlacements 존재 + 비어있지 않음) — 홈 applySnapshot 과 동일 해석.
  const free = props.terrarium.freePlacements
  if (free && free.length > 0) {
    return free.map((it, i): FriendRenderItem => {
      const fallback = DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length]!
      return {
        id: it.placementId,
        image: it.itemImage,
        name: it.itemName,
        // FreePlacementItem 계약에는 isAnimated 가 없다 — 실좌표 경로는 부유 연출 없이 정적 렌더.
        isAnimated: false,
        // 로드 clamp 도메인 = 컨테이너 전체(0~400/0~552) — 서버 저장값(0~1)을 손상 없이 표시.
        // 비자유배치 항목은 홈과 동일하게 index 기반 폴백 좌표.
        x: it.isFreePlacement ? clamp(it.posX * 400, 0, 400) : fallback.x,
        y: it.isFreePlacement ? clamp(it.posY * 552, 0, 552) : fallback.y,
        scale: it.scale,
        flipped: it.flipped,
        zIndex: it.zIndex,
      }
    })
  }
  // 경로 2: 폴백 (슬롯 기반 placedItems) — 결정적 위치, scale/flip 기본값.
  return (props.terrarium.placedItems ?? []).map((p, i): FriendRenderItem => {
    // slotId 우선(슬롯별 고정 위치), 결측 시 배열 index — 둘 다 결정적이라 재렌더에 안정.
    const pos = DEFAULT_POSITIONS[(p.slotId ?? i) % DEFAULT_POSITIONS.length]!
    return {
      id: p.id,
      image: p.itemImage,
      name: p.itemName,
      isAnimated: p.isAnimated,
      x: pos.x,
      y: pos.y,
      scale: 1,
      flipped: false,
      zIndex: i,
    }
  })
})

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// 홈 itemStyle 과 동일 수식 — 중심좌표(x,y)에서 HALF 를 빼 좌상단 기준으로 변환.
function itemStyle(item: FriendRenderItem): Record<string, string> {
  return {
    left: `${item.x - HALF}px`,
    top: `${item.y - HALF}px`,
    width: `${BASE_SIZE}px`,
    height: `${BASE_SIZE}px`,
    zIndex: String(10 + item.zIndex),
  }
}

function isUrl(s: string | undefined | null): boolean {
  return !!s && (s.startsWith('http') || s.startsWith('/'))
}

// ─── stageFit (홈과 동일 패턴) ───
// 모달 Transition 안에서 늦게 마운트될 수 있어 template ref 를 watch 해 요소 등장 시점에
// observer 를 부착한다 (홈의 스켈레톤 지연 마운트 대응과 같은 이유).
const stageEl = ref<HTMLElement | null>(null)
const stageFit = ref<number>(1)
let stageFitObserver: ResizeObserver | null = null
watch(stageEl, (el) => {
  stageFitObserver?.disconnect()
  stageFitObserver = null
  if (!el || typeof ResizeObserver === 'undefined') return
  stageFitObserver = new ResizeObserver(() => {
    stageFit.value = Math.min(1, el.clientWidth / 400)
  })
  stageFitObserver.observe(el)
}, { immediate: true })
onBeforeUnmount(() => {
  stageFitObserver?.disconnect()
  stageFitObserver = null
})
</script>

<style scoped>
/* 홈 .item-float 과 동일한 부유 애니메이션 (scoped 라 클래스명만 로컬) */
@keyframes friendItemFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.friend-item-float { animation: friendItemFloat 2s ease-in-out infinite; }
</style>
