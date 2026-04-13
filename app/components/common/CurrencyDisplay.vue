<template>
  <div>
    <!-- Coins 2-col grid -->
    <div class="grid grid-cols-2 gap-2 mb-2">
      <div
        class="flex items-center gap-2 px-3 py-3 rounded-xl"
        :style="{ backgroundColor: coinCellBg }"
      >
        <Icon name="lucide:star" class="w-5 h-5 text-[#595757] shrink-0" />
        <div>
          <div class="text-xs text-neutral-500 font-medium">기본 코인</div>
          <div class="font-bold text-black tabular-nums text-sm">{{ fmt(currency?.basicCoins) }}</div>
        </div>
      </div>
      <div
        class="flex items-center gap-2 px-3 py-3 rounded-xl"
        :style="{ backgroundColor: coinCellBg }"
      >
        <Icon name="lucide:gem" class="w-5 h-5 text-[#595757] shrink-0" />
        <div>
          <div class="text-xs text-neutral-500 font-medium">스페셜 코인</div>
          <div class="font-bold text-black tabular-nums text-sm">{{ fmt(currency?.specialCoins) }}</div>
        </div>
      </div>
    </div>

    <!-- Tokens 4-col grid -->
    <div class="grid grid-cols-4 gap-2">
      <div
        v-for="tk in tokens"
        :key="tk.label"
        class="flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-center"
        :style="{ backgroundColor: coinCellBg }"
      >
        <Icon :name="tk.icon" class="w-4 h-4 text-[#595757]" />
        <div class="text-[11px] text-neutral-500 font-medium">{{ tk.label }}</div>
        <div class="font-bold text-black tabular-nums text-xs">{{ fmt(tk.value) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CurrencyResponse } from '@terraworld-it/openapi-frontend'

const props = withDefaults(
  defineProps<{
    currency?: CurrencyResponse | null
    coinCellBg?: string
  }>(),
  {
    currency: null,
    coinCellBg: '#fef9e7',
  },
)

const tokens = computed(() => {
  const c = props.currency
  if (!c) return []
  return [
    { icon: 'lucide:footprints', label: '산책', value: c.walkTokens },
    { icon: 'lucide:book-open', label: '독서', value: c.readTokens },
    { icon: 'lucide:zap', label: '러닝', value: c.runTokens },
    { icon: 'lucide:palette', label: '낙서', value: c.drawTokens },
  ]
})

function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
</script>
