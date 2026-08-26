<!--
  테라리움 병 아트 — 디자이너 제공 Lv.1/2/3 병 이미지(public/jar).
  `base` 레이어는 병 본체(유리·흙·언덕)로 배치 아이템 아래에, `texture` 레이어는 유리 질감 오버레이로
  아이템 위에 겹친다(pointer-events 없음). 부모가 400x552 스테이지든 축소 카드든 absolute inset-0 로 채운다.
-->
<template>
  <img
    :src="layer === 'texture' ? `/jar/lv${lv}-texture.webp` : `/jar/lv${lv}.webp`"
    alt=""
    class="absolute inset-0 w-full h-full object-contain select-none"
    :class="layer === 'texture' ? 'pointer-events-none' : ''"
    aria-hidden="true"
    draggable="false"
  >
</template>

<script setup lang="ts">
import { MAX_JAR_LEVEL } from '~/utils/tierLevels'

const props = withDefaults(defineProps<{
  /** 병 레벨(1~3) — 범위 밖이면 가장 가까운 레벨로 보정 */
  level?: number
  layer?: 'base' | 'texture'
}>(), {
  level: 1,
  layer: 'base',
})

const lv = computed<number>(() => Math.min(MAX_JAR_LEVEL, Math.max(1, Math.round(props.level))))
</script>
