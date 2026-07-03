<template>
  <CommonModal :model-value="show" @update:model-value="$emit('close')">
    <div class="space-y-5">
      <h3 class="font-bold text-lg text-riso-dark">{{ $t('exchange.title') }}</h3>

      <!-- Current balance -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-riso-butter/30 rounded-xl p-3 text-center">
          <p class="text-[10px] text-riso-dark/40 mb-1">{{ $t('currency.basicCoin') }}</p>
          <p class="font-bold text-riso-dark">{{ balanceOf(currency, 'COIN').toFixed(1) }}</p>
        </div>
        <div class="bg-riso-lavender/20 rounded-xl p-3 text-center">
          <p class="text-[10px] text-riso-dark/40 mb-1">{{ $t('currency.specialCoin') }}</p>
          <p class="font-bold text-riso-dark">{{ balanceOf(currency, 'RUBY').toFixed(1) }}</p>
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
          <p class="text-xs text-riso-dark/40">{{ $t('exchange.specialToBasicDesc') }}</p>
          <input
            v-model="specialAmount"
            type="number"
            min="1"
            :placeholder="$t('exchange.specialAmountPlaceholder')"
            class="w-full h-12 rounded-xl border border-riso-walnut/10 bg-white px-4 text-riso-dark placeholder:text-riso-dark/30 focus:outline-none focus:ring-2 focus:ring-riso-sage"
          >
          <div class="flex items-center justify-center gap-2 text-sm">
            <span class="text-riso-dark/60">{{ specialAmount || 0 }} {{ $t('exchange.special') }}</span>
            <span class="text-riso-dark/30">→</span>
            <span class="font-bold text-riso-sage">{{ (Number(specialAmount) || 0) * 2 }} {{ $t('currency.basicCoin') }}</span>
          </div>
          <button
            class="w-full h-11 rounded-full bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-95 transition-transform disabled:opacity-50"
            :disabled="exchanging || !specialAmount || Number(specialAmount) <= 0"
            @click="exchangeSpecial"
          >
            {{ exchanging ? $t('exchange.exchanging') : $t('exchange.doExchange') }}
          </button>
        </div>
      </template>

      <!-- Token → Token -->
      <template v-else-if="tab === 'token'">
        <div class="space-y-3">
          <p class="text-xs text-riso-dark/40">{{ $t('exchange.tokenToTokenDesc') }}</p>
          <div class="grid grid-cols-2 gap-3">
            <select
              v-model="fromCategoryId"
              class="h-11 rounded-xl border border-riso-walnut/10 bg-white px-3 text-sm text-riso-dark"
            >
              <option :value="null" disabled>{{ $t('exchange.fromToken') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.emoji }} {{ cat.name }}
              </option>
            </select>
            <select
              v-model="toCategoryId"
              class="h-11 rounded-xl border border-riso-walnut/10 bg-white px-3 text-sm text-riso-dark"
            >
              <option :value="null" disabled>{{ $t('exchange.toToken') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id" :disabled="cat.id === fromCategoryId">
                {{ cat.emoji }} {{ cat.name }}
              </option>
            </select>
          </div>
          <input
            v-model="tokenAmount"
            type="number"
            min="1"
            :placeholder="$t('exchange.amountPlaceholder')"
            class="w-full h-12 rounded-xl border border-riso-walnut/10 bg-white px-4 text-riso-dark placeholder:text-riso-dark/30 focus:outline-none focus:ring-2 focus:ring-riso-sage"
          >
          <button
            class="w-full h-11 rounded-full bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-95 transition-transform disabled:opacity-50"
            :disabled="exchanging || !fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId || !tokenAmount"
            @click="exchangeToken"
          >
            {{ exchanging ? $t('exchange.exchanging') : $t('exchange.doExchange') }}
          </button>
        </div>
      </template>

      <!-- Token → Basic (N15) -->
      <template v-else>
        <div class="space-y-3">
          <p class="text-xs text-riso-dark/40">{{ $t('exchange.tokenToBasicDesc') }}</p>
          <select
            v-model="tbCategoryId"
            class="w-full h-11 rounded-xl border border-riso-walnut/10 bg-white px-3 text-sm text-riso-dark"
          >
            <option :value="null" disabled>{{ $t('exchange.tokenToDewPlaceholder') }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.emoji }} {{ cat.name }}
            </option>
          </select>
          <input
            v-model="tbAmount"
            type="number"
            min="1"
            :placeholder="$t('exchange.tokenAmountPlaceholder')"
            class="w-full h-12 rounded-xl border border-riso-walnut/10 bg-white px-4 text-riso-dark placeholder:text-riso-dark/30 focus:outline-none focus:ring-2 focus:ring-riso-sage"
          >
          <div class="flex items-center justify-center gap-2 text-sm">
            <span class="text-riso-dark/60">{{ tbAmount || 0 }} {{ $t('common.token') }}</span>
            <span class="text-riso-dark/30">→</span>
            <span class="font-bold text-riso-sage">{{ Number(tbAmount) || 0 }} {{ $t('currency.basicCoin') }}</span>
          </div>
          <button
            class="w-full h-11 rounded-full bg-riso-sage text-white font-medium text-sm riso-shadow-sm active:scale-95 transition-transform disabled:opacity-50"
            :disabled="exchanging || !tbCategoryId || !tbAmount || Number(tbAmount) <= 0"
            @click="exchangeTokenBasic"
          >
            {{ exchanging ? $t('exchange.exchanging') : $t('exchange.doExchange') }}
          </button>
        </div>
      </template>
    </div>
  </CommonModal>
</template>

<script setup lang="ts">
import type { CategoryResponse, CurrencyResponse } from '@terraworld-it/openapi-frontend'
import type { CurrencyCode } from '~/utils/currency'

const props = defineProps<{
  show: boolean
  currency: CurrencyResponse | null
  categories: CategoryResponse[]
}>()

const emit = defineEmits<{
  close: []
  exchanged: []
}>()

const { t } = useI18n()
const { sdk, client } = useOpenApi()
const toast = useToast()

const tab = ref<'special' | 'token' | 'tokenBasic'>('special')
const tabs = computed(() => [
  { key: 'special' as const, label: t('exchange.tabSpecial') },
  { key: 'token' as const, label: t('exchange.tabToken') },
  // N15 (구현 계획서 v4): 카테고리 토큰 → 이슬(기본 코인) 교환
  { key: 'tokenBasic' as const, label: t('exchange.tabTokenBasic') },
])

const specialAmount = ref<string>('')
const fromCategoryId = ref<number | null>(null)
const toCategoryId = ref<number | null>(null)
const tokenAmount = ref<string>('')
// N15: 토큰→이슬 교환 상태
const tbCategoryId = ref<number | null>(null)
const tbAmount = ref<string>('')
const exchanging = ref<boolean>(false)

// 낙서장 P1: 카테고리 ID → 활동 화폐 코드 (WalletBuilder 매핑과 동일: 1산책/2독서/3러닝/4낙서)
const CATEGORY_TO_CURRENCY: Record<number, CurrencyCode> = { 1: 'DEW', 2: 'SUN', 3: 'BOLT', 4: 'WIND' }

async function exchangeSpecial() {
  if (!specialAmount.value) return
  exchanging.value = true
  try {
    // 스페셜(RUBY) → 기본(COIN). 낙서장 7화폐 directed exchange
    const { error } = await sdk.exchange({ client, body: { from: 'RUBY', to: 'COIN', amount: Number(specialAmount.value) } })
    if (error) throw error
    toast.success(t('exchange.success'))
    specialAmount.value = ''
    emit('exchanged')
  }
  catch { toast.error(t('exchange.failed')) }
  finally { exchanging.value = false }
}

// 낙서장 P1: 활동토큰 상호변환(token↔token)은 신 경제에서 폐지 — 활동토큰은 COIN 으로 단방향만.
// 전체 모달 재디자인(신 Figma)은 FE 트랙에서 진행. 임시로 폐지 안내.
function exchangeToken() {
  toast.info(t('exchange.tokenSwapRetired'))
}

// 활동 토큰 → COIN 교환 (낙서장 §1 one-way)
async function exchangeTokenBasic() {
  if (!tbCategoryId.value || !tbAmount.value) return
  const from = CATEGORY_TO_CURRENCY[tbCategoryId.value]
  if (!from) { toast.error(t('exchange.failed')); return }
  exchanging.value = true
  try {
    const { error } = await sdk.exchange({ client, body: { from, to: 'COIN', amount: Number(tbAmount.value) } })
    if (error) throw error
    toast.success(t('exchange.success'))
    tbAmount.value = ''
    emit('exchanged')
  }
  catch { toast.error(t('exchange.failed')) }
  finally { exchanging.value = false }
}
</script>
