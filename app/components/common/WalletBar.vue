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
  </div>
</template>

<script setup lang="ts">
import { CATEGORY_ICONS } from '~/utils/constants'
import { formatNumber } from '~/utils/format'

interface TokenDisplay { categoryId: number; categoryName: string; amount: number }

withDefaults(defineProps<{
  coin?: number
  tokens?: TokenDisplay[]
}>(), {
  coin: 0,
  tokens: () => [],
})

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[name] || '🪙'
}
</script>
