<template>
  <!-- G1 도장판 — 반투명 화이트 카드 + 10열 원형 스탬프 그리드 (아프젝 fig-grow 도장판 스펙).
       complete(30 달성) 시 핑크-퍼플 틴트 배경 + 우측 라벨이 "획득 성공!" 으로 바뀐다. -->
  <div
    class="rounded-[20px] border border-white/50 px-[18px] py-[16px]"
    :class="complete ? '' : 'bg-white/60'"
    :style="complete ? { background: 'linear-gradient(180deg, rgba(228,214,255,0.65) 0%, rgba(251,147,207,0.4) 100%)' } : {}"
  >
    <!-- 헤더: 좌 진행 카운트 / 우 달성 안내 -->
    <div class="flex items-center justify-between gap-2">
      <span class="text-[11px] tracking-[-0.2px] text-apjek-text whitespace-nowrap">
        연속 기록 도장 {{ progress }}/{{ goal }}일<template v-if="dormant"> · 잠들었어요</template>
      </span>
      <span
        class="text-[11px] tracking-[-0.2px] whitespace-nowrap"
        :class="complete ? 'font-semibold text-apjek-text' : 'text-apjek-text-sub'"
      >
        {{ complete ? `${kindLabel} 획득 성공!` : `${goal}개 달성 시 ${kindLabel} 획득` }}
      </span>
    </div>

    <!-- 진행 바 -->
    <div class="mt-[10px] h-[4px] rounded-full bg-black/10 overflow-hidden">
      <div
        class="h-full rounded-full bg-apjek-sparkle transition-all duration-[600ms] ease-out"
        :style="{ width: pct }"
      />
    </div>

    <!-- 30칸 스탬프 그리드 (10열 × ceil(goal/10)행 — goal 은 서버 값) -->
    <div class="mt-[16px] grid grid-cols-10 gap-x-[4px] gap-y-[12px] justify-items-center">
      <template v-for="n in goal" :key="n">
        <!-- 채워진 칸: 핑크 도장 (radial 하이라이트로 구슬 느낌) -->
        <span
          v-if="n <= progress"
          class="w-6 h-6 rounded-full"
          :style="{ background: 'radial-gradient(circle at 35% 30%, var(--color-apjek-sparkle-bg) 0%, var(--color-apjek-sparkle) 78%)' }"
        />
        <!-- 빈 칸: 번호 원. 다음에 찍힐 칸은 핑크 점선 보더로 강조 -->
        <span
          v-else
          class="w-6 h-6 rounded-full flex items-center justify-center bg-white/60 border text-[10px] leading-none text-apjek-text-faint"
          :class="n === progress + 1 && !dormant && !complete ? 'border-dashed border-apjek-sparkle' : 'border-apjek-border-strong'"
        >{{ n }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// 도장판 진행 표시 전용 프레젠테이션 컴포넌트 — 서버 진행도(effectiveProgress)/goal 을
// 그대로 받아 그린다. 잠금(grayscale)·터치 토스트는 부모(grow.vue)의 래퍼가 담당.
const props = defineProps<{
  progress: number
  goal: number
  dormant?: boolean
  complete?: boolean
  /** '정령' | '판타지 식물' — 우측 헤더 문구용 */
  kindLabel: string
}>()

const pct = computed<string>(() => `${Math.min(100, (props.progress / Math.max(1, props.goal)) * 100)}%`)
</script>
