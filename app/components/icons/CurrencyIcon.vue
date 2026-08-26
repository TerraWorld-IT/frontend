<!--
  재화 아이콘 (7화폐) — 디자이너 제공 토큰 아이콘 PNG(`public/icons/token`). 타일형(60x60@3x)과
  미니(30x30@3x, 글로우 원만) 두 벌이 있고 표시 크기 24px 이하면 미니를 쓴다(상점 가격·칩 자리).
  화면 공통 사용: <IconsCurrencyIcon code="COIN" :size="20" />. code ∈ COIN/RUBY/SPARKLE/DEW/SUN/BOLT/WIND.
  (이전 단색 SVG 글리프는 디자인과 달라 교체 — color prop 은 호환을 위해 남기되 쓰지 않는다.)
-->
<template>
  <img
    :src="tokenIconSrc(code, size)"
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
import { tokenIconSrc } from '~/utils/currency'

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
