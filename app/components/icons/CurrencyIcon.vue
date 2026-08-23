<!--
  재화 아이콘 (7화폐) — Figma "탭 구분" 섹션의 60x60 토큰 아이콘(코인/루비/반짝이/이슬/햇살/번개/바람)을
  3x PNG 로 내보내 `public/icons/token/*.png` 에 두고 그대로 그린다. 화면 공통 사용:
  <IconsCurrencyIcon code="COIN" :size="20" />. code ∈ COIN/RUBY/SPARKLE/DEW/SUN/BOLT/WIND.
  (이전 단색 SVG 글리프는 디자인과 달라 교체 — color prop 은 호환을 위해 남기되 쓰지 않는다.)
-->
<template>
  <img
    :src="TOKEN_ICON_SRC[code]"
    :width="size"
    :height="size"
    :style="{ width: `${size}px`, height: `${size}px` }"
    class="inline-block object-contain shrink-0 select-none"
    :alt="alt ?? ''"
    :aria-hidden="alt ? undefined : 'true'"
    draggable="false"
  >
</template>

<script setup lang="ts">
import type { CurrencyCode } from '~/utils/currency'
import { TOKEN_ICON_SRC } from '~/utils/currency'

withDefaults(defineProps<{
  code: CurrencyCode
  size?: number
  /** 호환용 — PNG 아이콘은 색을 바꾸지 않는다. */
  color?: string
  /** 의미 있는 이미지로 노출할 때만 대체 텍스트 지정(기본 장식). */
  alt?: string
}>(), {
  size: 20,
  color: '#595757',
  alt: undefined,
})
</script>
