<template>
  <div
    class="relative inline-block transition-all duration-500"
    :style="{ filter: stageVisual.filter }"
    :aria-label="`테라리움 레벨 ${clampedStage}/5`"
  >
    <!-- 병 본체: 기존 JamjarSvg 재사용 -->
    <IconsJamjarSvg />

    <!-- stage 3+ : 주변 글로우 -->
    <div
      v-if="clampedStage >= 3"
      class="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl opacity-40"
      :class="stageVisual.glowClass"
      aria-hidden="true"
    />

    <!-- stage 4+ : 상단 별빛 장식 -->
    <div
      v-if="clampedStage >= 4"
      class="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 flex gap-2"
      aria-hidden="true"
    >
      <span
        v-for="i in clampedStage - 3"
        :key="i"
        class="text-riso-butter text-lg animate-float"
        :style="{ animationDelay: `${i * 0.3}s` }"
      >
        ✦
      </span>
    </div>

    <!-- 레벨 뱃지 -->
    <div
      class="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-riso-navy text-white text-xs font-bold flex items-center justify-center riso-shadow-sm"
      :aria-label="`레벨 ${clampedStage}`"
    >
      Lv.{{ clampedStage }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 테라리움 5단계 진화 UI — 최소 버전.
 *
 * 실제 디자이너가 stage 별 SVG 를 넘기기 전까지는 기존 JamjarSvg 를 공통 베이스로
 * 쓰고, CSS filter / 부가 장식으로 stage 간 차이를 신호.
 *
 * stage 는 1~5 로 clamp 된다.
 *   1: 흐릿한 회색톤 (새싹 시작)
 *   2: 연한 따뜻함 (자람)
 *   3: 크림톤 + 은은한 글로우 (성장)
 *   4: 따뜻한 글로우 + 별빛 1개 (성숙)
 *   5: 풀컬러 + 별빛 2개 + 선명한 글로우 (완성)
 */
const props = defineProps<{
  /** 사용자 level (1~5 를 기대, 범위 밖은 clamp). */
  stage: number
}>()

const clampedStage = computed(() => Math.max(1, Math.min(5, Math.round(props.stage))))

interface StageVisual {
  filter: string
  glowClass: string
}

const STAGE_MAP: Record<1 | 2 | 3 | 4 | 5, StageVisual> = {
  1: { filter: 'saturate(0.55) brightness(0.96)', glowClass: '' },
  2: { filter: 'saturate(0.8) brightness(0.98)', glowClass: '' },
  3: { filter: 'saturate(1) brightness(1)', glowClass: 'bg-riso-butter' },
  4: { filter: 'saturate(1.08) brightness(1.02)', glowClass: 'bg-riso-peach' },
  5: { filter: 'saturate(1.18) brightness(1.04)', glowClass: 'bg-riso-pink' },
}

const stageVisual = computed<StageVisual>(() => STAGE_MAP[clampedStage.value as 1 | 2 | 3 | 4 | 5])
</script>
