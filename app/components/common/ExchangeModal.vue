<template>
  <CommonModal :show="show" @close="$emit('close')">
    <div class="space-y-5">
      <h3 class="font-bold text-lg text-riso-dark">토큰 교환</h3>

      <!-- Current balance -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-riso-butter/30 rounded-xl p-3 text-center">
          <p class="text-[10px] text-riso-dark/40 mb-1">기본 코인</p>
          <p class="font-bold text-riso-dark">{{ currency?.basicCoins?.toFixed(1) ?? '0' }}</p>
        </div>
        <div class="bg-riso-lavender/20 rounded-xl p-3 text-center">
          <p class="text-[10px] text-riso-dark/40 mb-1">스페셜 코인</p>
          <p class="font-bold text-riso-dark">{{ currency?.specialCoins?.toFixed(1) ?? '0' }}</p>
        </div>
      </div>

      <!-- Tab: special→basic / token→token -->
      <div class="flex gap-2">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="[
            'flex-1 py-2 rounded-full text-xs font-medium transition-all',
            tab === t.key ? 'bg-riso-navy text-white' : 'bg-white text-riso-dark/50 border border-riso-walnut/10',
          ]"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- Special → Basic -->
      <template v-if="tab === 'special'">
        <div class="space-y-3">
          <p class="text-xs text-riso-dark/40">스페셜 코인 → 기본 코인 (1:2 비율)</p>
          <input
            v-model="specialAmount"
            type="number"
            min="1"
            placeholder="교환할 스페셜 코인"
            class="w-full h-12 rounded-xl border border-riso-walnut/10 bg-white px-4 text-riso-dark placeholder:text-riso-dark/30 focus:outline-none focus:ring-2 focus:ring-riso-sage"
          >
          <div class="flex items-center justify-center gap-2 text-sm">
            <span class="text-riso-dark/60">{{ specialAmount || 0 }} 스페셜</span>
            <span class="text-riso-dark/30">→</span>
            <span class="font-bold text-riso-sage">{{ (Number(specialAmount) || 0) * 2 }} 기본 코인</span>
          </div>
          <button
            class="w-full h-11 rounded-full bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-95 transition-transform disabled:opacity-50"
            :disabled="exchanging || !specialAmount || Number(specialAmount) <= 0"
            @click="exchangeSpecial"
          >
            {{ exchanging ? '교환 중...' : '교환하기' }}
          </button>
        </div>
      </template>

      <!-- Token → Token -->
      <template v-else>
        <div class="space-y-3">
          <p class="text-xs text-riso-dark/40">카테고리 토큰 간 교환 (1:1 비율)</p>
          <div class="grid grid-cols-2 gap-3">
            <select
              v-model="fromCategoryId"
              class="h-11 rounded-xl border border-riso-walnut/10 bg-white px-3 text-sm text-riso-dark"
            >
              <option :value="null" disabled>보낼 토큰</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.emoji }} {{ cat.name }}
              </option>
            </select>
            <select
              v-model="toCategoryId"
              class="h-11 rounded-xl border border-riso-walnut/10 bg-white px-3 text-sm text-riso-dark"
            >
              <option :value="null" disabled>받을 토큰</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id" :disabled="cat.id === fromCategoryId">
                {{ cat.emoji }} {{ cat.name }}
              </option>
            </select>
          </div>
          <input
            v-model="tokenAmount"
            type="number"
            min="1"
            placeholder="교환할 수량"
            class="w-full h-12 rounded-xl border border-riso-walnut/10 bg-white px-4 text-riso-dark placeholder:text-riso-dark/30 focus:outline-none focus:ring-2 focus:ring-riso-sage"
          >
          <button
            class="w-full h-11 rounded-full bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-95 transition-transform disabled:opacity-50"
            :disabled="exchanging || !fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId || !tokenAmount"
            @click="exchangeToken"
          >
            {{ exchanging ? '교환 중...' : '교환하기' }}
          </button>
        </div>
      </template>
    </div>
  </CommonModal>
</template>

<script setup lang="ts">
import type { CategoryResponse, CurrencyResponse } from '@terraworld-it/openapi-frontend'

const props = defineProps<{
  show: boolean
  currency: CurrencyResponse | null
  categories: CategoryResponse[]
}>()

const emit = defineEmits<{
  close: []
  exchanged: []
}>()

const { sdk, client } = useOpenApi()
const toast = useToast()

const tab = ref<'special' | 'token'>('special')
const tabs = [
  { key: 'special' as const, label: '스페셜→기본' },
  { key: 'token' as const, label: '토큰↔토큰' },
]

const specialAmount = ref('')
const fromCategoryId = ref<number | null>(null)
const toCategoryId = ref<number | null>(null)
const tokenAmount = ref('')
const exchanging = ref(false)

async function exchangeSpecial() {
  if (!specialAmount.value) return
  exchanging.value = true
  try {
    const { error } = await sdk.exchangeSpecialToBasic({ client, body: { amount: Number(specialAmount.value) } })
    if (error) throw error
    toast.success('교환 완료!')
    specialAmount.value = ''
    emit('exchanged')
  }
  catch { toast.error('교환에 실패했습니다') }
  finally { exchanging.value = false }
}

async function exchangeToken() {
  if (!fromCategoryId.value || !toCategoryId.value || !tokenAmount.value) return
  exchanging.value = true
  try {
    const { error } = await sdk.exchangeTokens({
      client,
      body: {
        fromCategoryId: fromCategoryId.value,
        toCategoryId: toCategoryId.value,
        amount: Number(tokenAmount.value),
      },
    })
    if (error) throw error
    toast.success('교환 완료!')
    tokenAmount.value = ''
    emit('exchanged')
  }
  catch { toast.error('교환에 실패했습니다') }
  finally { exchanging.value = false }
}
</script>
