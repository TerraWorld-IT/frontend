<template>
  <!-- 개체 비주얼: 공개된 정령은 단계 PNG, 토마토는 인라인 SVG(TW2 이관), 그 외 종은 asset(gif) fallback.
       grow.vue 에서 이식 — 씬/성공 카드 두 곳에서 재사용하기 위해 분리. -->
  <!-- 공개 코드가 없으면 기존 고양이 그림. tier 미지정이면 2단계 전신. -->
  <img
    v-if="speciesCode === 'cat'"
    :src="spiritImageSrc(revealedSpiritCode, tier)"
    :alt="nameKo"
    :height="tier === 'stage1' ? 138 : 173"
    :class="tier === 'stage1' ? 'h-[138px]' : 'h-[173px]'"
    class="w-auto max-w-full object-contain animate-float select-none"
    draggable="false"
  >
  <TomatoVine v-else-if="speciesCode === 'tomato-vine'" class="animate-sway" />
  <img
    v-else
    :src="itemAssetUrl(speciesCode, reducedMotion ? 'png' : 'gif')"
    :alt="nameKo"
    class="w-[140px] h-[140px] object-contain animate-float"
    @error="onAssetError"
  >
</template>

<script setup lang="ts">
import { h } from 'vue'
import svgPaths from '~/pages/grow-svg-paths'
import type { SpiritTier } from '~/utils/grow'
import { spiritImageSrc } from '~/utils/grow'

defineProps<{
  speciesCode: string
  nameKo: string
  revealedSpiritCode?: string | null
  /** 단계(G2) — 공개 정령 일러스트 선택(stage1=얼굴, 그 외=전신) */
  tier?: SpiritTier
}>()

const { itemAssetUrl, onAssetError } = useItemAsset()
const reducedMotion: boolean = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
</script>
