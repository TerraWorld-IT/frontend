<!--
  테라리움 병 아트 — 디자이너 제공 Lv.1/2/3 병 이미지(public/jar).
  병 본체(유리·흙·언덕)를 배치 아이템 아래에 그린다.
  부모가 400x552 스테이지든 축소 카드든 absolute inset-0 로 채운다.
  `variant`(예: pink)는 배경 아이템이 병 색 변형인 경우 base 를 `/jar/lv{N}-{variant}.webp` 로 바꾼다
  (utils/jarVariants).
-->
<template>
  <img
    :src="`/jar/lv${lv}${variant ? `-${variant}` : ''}.webp`"
    alt=""
    class="absolute inset-0 w-full h-full object-contain select-none"
    aria-hidden="true"
    draggable="false"
  >
</template>

<script setup lang="ts">
import { MAX_JAR_LEVEL } from '~/utils/tierLevels'

const props = withDefaults(defineProps<{
  /** 병 레벨(1~3) — 범위 밖이면 가장 가까운 레벨로 보정 */
  level?: number
  /** 병 색 변형 이름(utils/jarVariants) — null/undefined 면 기본 병 */
  variant?: string | null
}>(), {
  level: 1,
  variant: null,
})

const lv = computed<number>(() => Math.min(MAX_JAR_LEVEL, Math.max(1, Math.round(props.level))))
</script>
