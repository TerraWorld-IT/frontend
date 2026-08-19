<template>
  <!-- 개체 비주얼: 알려진 종(speciesCode)은 인라인 SVG(TW2 이관), 그 외 종은 asset(gif) fallback.
       grow.vue 에서 이식 — 씬/성공 카드 두 곳에서 재사용하기 위해 분리. -->
  <CatSpirit v-if="speciesCode === 'cat'" class="animate-float" />
  <TomatoVine v-else-if="speciesCode === 'tomato-vine'" class="animate-sway" />
  <img
    v-else
    :src="itemAssetUrl(speciesCode, 'gif')"
    :alt="nameKo"
    class="w-[140px] h-[140px] object-contain animate-float"
    @error="onAssetError"
  >
</template>

<script setup lang="ts">
import { h } from 'vue'
import svgPaths from '~/pages/grow-svg-paths'

defineProps<{
  speciesCode: string
  nameKo: string
}>()

const { itemAssetUrl, onAssetError } = useItemAsset()

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
</script>
