<template>
  <div>
    <!-- 코인 / 루비 / 반짝이 3-col -->
    <div class="grid grid-cols-3 gap-2 mb-2">
      <div
        v-for="m in coinMetas"
        :key="m.code"
        class="flex items-center gap-2 px-3 py-3 rounded-xl"
        :style="{ backgroundColor: coinCellBg }"
      >
        <Icon :name="m.icon" class="w-5 h-5 text-[#595757] shrink-0" />
        <div>
          <div class="text-xs text-neutral-500 font-medium">{{ m.labelKo }}</div>
          <div class="font-bold text-black tabular-nums text-sm">{{ fmt(balanceOf(currency, m.code)) }}</div>
        </div>
      </div>
    </div>

    <!-- 토큰 4종 (이슬/햇살/번개/바람) 4-col -->
    <div class="grid grid-cols-4 gap-2">
      <div
        v-for="m in tokenMetas"
        :key="m.code"
        class="flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-center"
        :style="{ backgroundColor: coinCellBg }"
      >
        <Icon :name="m.icon" class="w-4 h-4 text-[#595757]" />
        <div class="text-[11px] text-neutral-500 font-medium">{{ m.labelKo }}</div>
        <div class="font-bold text-black tabular-nums text-xs">{{ fmt(balanceOf(currency, m.code)) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CurrencyResponse } from '@terraworld-it/openapi-frontend'
import { balanceOf, CURRENCY_META, type CurrencyCode } from '~/utils/currency'

withDefaults(
  defineProps<{
    currency?: CurrencyResponse | null
    coinCellBg?: string
  }>(),
  {
    currency: null,
    coinCellBg: '#fef9e7',
  },
)

// 낙서장 리팩토링 req 1: 7화폐 balances[] 표시 (코인/루비/반짝이 + 이슬/햇살/번개/바람).
const TOKEN_CODES: CurrencyCode[] = ['DEW', 'SUN', 'BOLT', 'WIND']
const coinMetas = CURRENCY_META.filter(m => !TOKEN_CODES.includes(m.code))
const tokenMetas = CURRENCY_META.filter(m => TOKEN_CODES.includes(m.code))

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
</script>
