<template>
  <div class="riso-grain min-h-screen space-y-5 pb-4">
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">불러오기 실패</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
      <button class="mt-2 px-4 py-2 rounded-full bg-riso-sage text-white text-sm" @click="load">
        다시 시도
      </button>
    </div>

    <template v-else>
      <!-- Header -->
      <div>
        <h2 class="text-xl font-bold text-black mb-1">보유 재화</h2>
        <p class="text-sm text-neutral-600">재화를 사용해 아이템을 구매하세요</p>
      </div>

      <!-- Currency display + exchange button -->
      <div class="py-4">
        <div class="flex items-center justify-start mb-4">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-black text-white hover:bg-black/90 text-sm font-medium flex items-center gap-2"
            @click="showExchange = true"
          >
            <Icon name="lucide:refresh-cw" class="w-4 h-4" />
            환전
          </button>
        </div>

        <!-- Coins row -->
        <div class="grid grid-cols-2 gap-2 text-sm mb-2">
          <div class="flex items-center gap-2 px-3 py-3 rounded-xl" style="background-color: #fef9e7">
            <Icon name="lucide:star" class="w-5 h-5 text-[#595757]" />
            <div>
              <div class="text-xs text-neutral-500 font-medium">기본 코인</div>
              <div class="font-bold text-black tabular-nums">{{ formatCoin(currency?.basicCoins) }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-3 rounded-xl" style="background-color: #fef9e7">
            <Icon name="lucide:gem" class="w-5 h-5 text-[#595757]" />
            <div>
              <div class="text-xs text-neutral-500 font-medium">스페셜 코인</div>
              <div class="font-bold text-black tabular-nums">{{ formatCoin(currency?.specialCoins) }}</div>
            </div>
          </div>
        </div>

        <!-- Tokens row -->
        <div class="grid grid-cols-4 gap-2 text-sm">
          <div
            v-for="tk in tokenDisplay"
            :key="tk.label"
            class="flex flex-col items-center gap-2 px-3 py-3 rounded-xl"
            style="background-color: #fef9e7"
          >
            <Icon :name="tk.icon" class="w-5 h-5 text-[#595757]" />
            <div class="font-bold text-black tabular-nums">{{ formatCoin(tk.value) }}</div>
          </div>
        </div>
      </div>

      <!-- Shop type toggle -->
      <div class="flex gap-2">
        <button
          v-for="t in (['plant', 'figure'] as const)"
          :key="t"
          type="button"
          class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
          :class="shopType === t ? 'bg-black text-white' : 'bg-white text-black border border-black/10'"
          @click="shopType = t"
        >
          {{ t === 'plant' ? '식물 상점' : '피규어 상점' }}
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="tab in currentTabs"
          :key="tab.value"
          type="button"
          class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          :class="activeTab === tab.value ? 'bg-black text-white' : 'bg-white text-black/60 border border-black/10'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Items grid -->
      <div v-if="filteredItems.length > 0" class="grid grid-cols-2 gap-3">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="bg-white rounded-[16px] border border-black/10 p-3 flex flex-col aspect-square"
          :style="ownedSlugs.has(item.slug ?? '') ? { backgroundColor: '#fdf9e9', borderColor: '#fdf9e9' } : {}"
        >
          <div class="font-semibold text-xs text-center mb-2 truncate">{{ item.name }}</div>

          <div class="flex-1 flex flex-col items-center justify-center">
            <div class="text-4xl mb-1">{{ item.assetUrl }}</div>
            <div v-if="item.isAnimated" class="text-xs text-yellow-500">✨</div>
          </div>

          <div class="space-y-1.5 mt-2">
            <!-- Badges -->
            <div class="flex items-center gap-1 flex-wrap justify-center">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full"
                :class="rarityClass(item.rarity)"
              >{{ rarityLabel(item.rarity) }}</span>
              <span
                v-if="item.layout !== 'FIGURE'"
                class="text-[10px] px-1.5 py-0.5 rounded-full border border-black/10"
              >{{ item.layout === 'FOREGROUND' ? '전경' : '후경' }}</span>
            </div>

            <!-- Price -->
            <div class="text-xs text-gray-600 text-center flex items-center justify-center gap-1">
              <template v-if="item.priceType === 'BASIC'">
                <Icon name="lucide:star" class="w-3 h-3" /> {{ item.priceAmount }}
              </template>
              <template v-else-if="item.priceType === 'SPECIAL'">
                <Icon name="lucide:gem" class="w-3 h-3" /> {{ item.priceAmount }}
              </template>
              <template v-else-if="item.priceType === 'MIXED'">
                <Icon name="lucide:star" class="w-3 h-3" /> {{ item.priceAmount }}
                <span class="mx-0.5">+</span>
                <Icon name="lucide:coins" class="w-3 h-3" /> {{ item.tokenPrice }}
              </template>
              <template v-else>
                <Icon name="lucide:coins" class="w-3 h-3" /> {{ item.priceAmount }}
              </template>
            </div>

            <!-- Buy / Owned -->
            <div v-if="ownedSlugs.has(item.slug ?? '')" class="text-center text-[10px] text-gray-500 border border-black/10 rounded-full py-1">
              보유중
            </div>
            <button
              v-else
              type="button"
              class="w-full text-xs py-1.5 rounded-full font-medium transition-colors disabled:bg-[#e5e5e5] disabled:text-[#a1a1a1]"
              :class="purchasing === item.id ? 'bg-gray-200 text-gray-500' : 'bg-black text-white hover:bg-black/90'"
              :disabled="purchasing === item.id"
              @click="onPurchase(item)"
            >
              {{ purchasing === item.id ? '...' : '구매' }}
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-12 text-sm text-gray-400">
        아이템이 없습니다
      </div>

      <!-- Exchange modal (overlay) -->
      <Teleport to="body">
        <div
          v-if="showExchange"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          @click.self="showExchange = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl p-5 w-[90%] max-w-md max-h-[85vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold flex items-center gap-2">
                <Icon name="lucide:refresh-cw" class="w-4 h-4" style="color: #fcee5a" />
                재화 환전
              </h3>
              <button type="button" @click="showExchange = false">
                <Icon name="lucide:x" class="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <!-- Special → Basic -->
            <div class="mb-4">
              <div class="text-sm font-semibold text-gray-700 mb-2">스페셜 → 기본 코인 (1:2)</div>
              <div class="flex items-center gap-3 p-3 rounded-xl" style="background-color: #fef9e7">
                <span class="text-2xl">💎</span>
                <input
                  v-model.number="exchSpecialAmt"
                  type="number"
                  min="1"
                  :max="currency?.specialCoins ?? 0"
                  class="w-20 h-8 rounded-lg border border-black/10 px-2 text-center text-sm"
                >
                <Icon name="lucide:arrow-right" class="w-4 h-4 text-gray-400" />
                <span class="text-2xl">⭐</span>
                <span class="font-bold text-green-600">+{{ (exchSpecialAmt ?? 0) * 2 }}</span>
              </div>
              <button
                type="button"
                class="mt-2 w-full py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                style="background-color: #fcee5a"
                :disabled="!exchSpecialAmt || exchSpecialAmt > (currency?.specialCoins ?? 0) || exchanging"
                @click="onExchangeSpecial"
              >
                {{ exchanging ? '환전 중...' : '환전' }}
              </button>
            </div>

            <!-- Token ↔ Token -->
            <div>
              <div class="text-sm font-semibold text-gray-700 mb-2">토큰 교환 (1:1)</div>
              <div class="flex items-center gap-2 mb-2">
                <select
                  v-model.number="exchFromCat"
                  class="flex-1 h-8 rounded-lg border border-black/10 px-2 text-sm"
                >
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.emoji ?? '' }} {{ cat.name }}
                  </option>
                </select>
                <Icon name="lucide:arrow-right" class="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  v-model.number="exchToCat"
                  class="flex-1 h-8 rounded-lg border border-black/10 px-2 text-sm"
                >
                  <option v-for="cat in categories.filter(c => c.id !== exchFromCat)" :key="cat.id" :value="cat.id">
                    {{ cat.emoji ?? '' }} {{ cat.name }}
                  </option>
                </select>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model.number="exchTokenAmt"
                  type="number"
                  min="1"
                  class="w-20 h-8 rounded-lg border border-black/10 px-2 text-center text-sm"
                >
                <span class="text-xs text-gray-500">개</span>
              </div>
              <button
                type="button"
                class="w-full py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                style="background-color: #fcee5a"
                :disabled="!exchTokenAmt || exchFromCat === exchToCat || exchanging"
                @click="onExchangeToken"
              >
                {{ exchanging ? '교환 중...' : '교환' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  CategoryResponse,
  CurrencyResponse,
  ItemResponse,
} from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default' })

const { sdk, client } = useOpenApi()
const toast = useToast()

// State
const pending = ref(true)
const fetchError = ref<Error | null>(null)
const currency = ref<CurrencyResponse | null>(null)
const categories = ref<CategoryResponse[]>([])
const items = ref<ItemResponse[]>([])
const ownedSlugs = ref(new Set<string>())
const shopType = ref<'plant' | 'figure'>('plant')
const activeTab = ref('common')
const purchasing = ref<number | null>(null)
const showExchange = ref(false)
const exchanging = ref(false)
const exchSpecialAmt = ref(1)
const exchFromCat = ref(1)
const exchToCat = ref(2)
const exchTokenAmt = ref(1)

const tokenDisplay = computed(() => {
  const c = currency.value
  if (!c) return []
  return [
    { icon: 'lucide:footprints', label: '산책', value: c.walkTokens },
    { icon: 'lucide:book-open', label: '독서', value: c.readTokens },
    { icon: 'lucide:zap', label: '러닝', value: c.runTokens },
    { icon: 'lucide:palette', label: '낙서', value: c.drawTokens },
  ]
})

const plantTabs = [
  { value: 'common', label: '일반' },
  { value: 'rare', label: '희귀' },
  { value: 'epic', label: '판타지' },
  { value: 'foreground', label: '전경' },
  { value: 'background', label: '후경' },
]
const figureTabs = [
  { value: 'common', label: '일반' },
  { value: 'rare', label: '희귀' },
  { value: 'epic', label: '판타지' },
]

const currentTabs = computed(() => shopType.value === 'plant' ? plantTabs : figureTabs)

const filteredItems = computed(() => {
  const isFigure = shopType.value === 'figure'
  const tab = activeTab.value

  return items.value.filter((it) => {
    if (isFigure && it.layout !== 'FIGURE') return false
    if (!isFigure && it.layout === 'FIGURE') return false

    if (tab === 'foreground') return it.layout === 'FOREGROUND'
    if (tab === 'background') return it.layout === 'BACKGROUND'
    if (tab === 'common') return it.rarity === 'COMMON'
    if (tab === 'rare') return it.rarity === 'RARE'
    if (tab === 'epic') return it.rarity === 'EPIC'
    return true
  })
})

function formatCoin(n: number | undefined | null): string {
  if (n === null || n === undefined) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function rarityLabel(r: string): string {
  if (r === 'EPIC') return '판타지'
  if (r === 'RARE') return '희귀'
  return '일반'
}
function rarityClass(r: string): string {
  if (r === 'EPIC') return 'bg-purple-100 text-purple-700'
  if (r === 'RARE') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

function errMsg(e: unknown, fb: string): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return fb
}

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [meRes, catRes, itemRes] = await Promise.all([
      sdk.getMe({ client }),
      sdk.listCategories({ client }),
      sdk.listItems({ client }),
    ])
    if (meRes.error) throw new Error(errMsg(meRes.error, 'getMe failed'))
    if (catRes.error) throw new Error(errMsg(catRes.error, 'listCategories failed'))
    if (itemRes.error) throw new Error(errMsg(itemRes.error, 'listItems failed'))

    currency.value = meRes.data?.currency ?? null
    categories.value = catRes.data?.categories ?? []
    items.value = itemRes.data?.items ?? []
    ownedSlugs.value = new Set(meRes.data?.ownedItems ?? [])
  }
 catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
 finally {
    pending.value = false
  }
}

async function onPurchase(item: ItemResponse) {
  if (purchasing.value) return
  purchasing.value = item.id
  try {
    const { data, error } = await sdk.purchaseItem({ client, body: { itemId: item.id } })
    if (error) throw new Error(errMsg(error, '구매 실패'))
    if (data) {
      currency.value = data.updatedCurrency
      ownedSlugs.value = new Set(data.ownedItems)
      toast.success(`${data.purchasedItem.name} 구매 완료!`)
    }
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    purchasing.value = null
  }
}

async function onExchangeSpecial() {
  if (exchanging.value || !exchSpecialAmt.value) return
  exchanging.value = true
  try {
    const { data, error } = await sdk.exchangeSpecialToBasic({
      client,
      body: { amount: exchSpecialAmt.value },
    })
    if (error) throw new Error(errMsg(error, '환전 실패'))
    if (data) {
      currency.value = data.updatedCurrency
      toast.success(`기본 코인 +${data.exchanged.toAmount}`)
      exchSpecialAmt.value = 1
    }
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    exchanging.value = false
  }
}

async function onExchangeToken() {
  if (exchanging.value || !exchTokenAmt.value || exchFromCat.value === exchToCat.value) return
  exchanging.value = true
  try {
    const { data, error } = await sdk.exchangeTokens({
      client,
      body: {
        fromCategoryId: exchFromCat.value,
        toCategoryId: exchToCat.value,
        amount: exchTokenAmt.value,
      },
    })
    if (error) throw new Error(errMsg(error, '교환 실패'))
    if (data) {
      currency.value = data.updatedCurrency
      toast.success(`${data.exchanged.toType} +${data.exchanged.toAmount}`)
      exchTokenAmt.value = 1
    }
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    exchanging.value = false
  }
}

// Reset tab when shop type changes
watch(shopType, () => { activeTab.value = 'common' })

onMounted(load)
</script>
