<template>
  <div class="flex items-center gap-2">
    <div class="inline-flex items-center gap-1.5 bg-riso-butter/60 px-2.5 py-1 rounded-full text-xs font-bold">
      🪙 {{ formatNumber(coin) }}
    </div>
    <div
      v-for="token in tokens"
      :key="token.categoryId"
      class="hidden sm:inline-flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full text-[10px] border border-riso-walnut/10"
    >
      <span>{{ getCategoryIcon(token.categoryName) }}</span>
      <span class="font-medium">{{ token.amount }}</span>
    </div>
    <!--
      UltraPlan v3 H-EXP-001 (2026-05-18): EXP progress 시각화.
      level + totalExp 가 prop 으로 전달 시만 표시. EXP 곡선 = 선형 N×100 (J-EVO §4.2.A — V14 migration 후).
      V12/V14 seed 컨벤션: level N 의 required_exp = (N-1)×100 (level 1=0, level 2=100, ..., level 10=900).
      → 현재 level N 의 누적 EXP 임계 = (N-1)×100. 다음 level (N+1) 임계 = N×100.
      → 진행률 = (totalExp - (N-1)×100) / 100 × 100, clamp [0, 100].
    -->
    <div
      v-if="level !== undefined && totalExp !== undefined"
      class="inline-flex items-center gap-1.5 bg-riso-sage/15 px-2.5 py-1 rounded-full text-[10px] font-medium"
      :aria-label="$t('wallet.levelProgress', { level, remaining: Math.max(0, nextLevelExp - totalExp) })"
    >
      <span class="text-riso-sage font-bold">Lv.{{ level }}</span>
      <div
        class="w-12 h-1.5 bg-white/60 rounded-full overflow-hidden"
        role="progressbar"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="h-full bg-riso-sage transition-all duration-300" :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_ICONS } from '~/utils/constants'
import { formatNumber } from '~/utils/format'

interface TokenDisplay { categoryId: number; categoryName: string; amount: number }

const props = withDefaults(defineProps<{
  coin?: number
  tokens?: TokenDisplay[]
  level?: number
  totalExp?: number
}>(), {
  coin: 0,
  tokens: () => [],
  level: undefined,
  totalExp: undefined,
})

// UltraPlan v3 §4.2.A J-EVO — 상한 10 (Codex post-audit MEDIUM 3)
const MAX_LEVEL = 10

// V12/V14 seed 컨벤션: level N 의 required_exp = (N-1)×100.
// 현재 level N → 다음 level (N+1) 의 required_exp = N×100.
const nextLevelExp = computed<number>(() => {
  const lvl = props.level ?? 1
  return lvl >= MAX_LEVEL ? (lvl - 1) * 100 : lvl * 100
})

const progressPercent = computed<number>(() => {
  const lvl = props.level ?? 1
  const exp = props.totalExp ?? 0
  if (lvl >= MAX_LEVEL) return 100
  // 현재 level 의 누적 EXP 임계 = (N-1)×100. 다음 level 임계까지 100 EXP 구간.
  const currentLevelExp = (lvl - 1) * 100
  const gained = exp - currentLevelExp
  return Math.min(100, Math.max(0, (gained / 100) * 100))
})

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[name] || '🪙'
}
</script>
