<template>
  <div class="min-h-screen pb-24">
    <!-- Layout Selector -->
    <CommonLayoutSelector />

    <!-- ================================================================== -->
    <!-- 1. JAR - Items inside a glass jar shape                            -->
    <!-- ================================================================== -->
    <div v-if="is('jar')" class="px-4 py-4 space-y-4">
      <!-- Wallet -->
      <ShopWallet :tokens="tokens" />

      <!-- Category Tabs -->
      <ShopTabs v-model="selectedTab" :tabs="shopTabs" />

      <!-- Glass Jar Frame -->
      <div class="relative mx-auto max-w-sm">
        <!-- Jar lid -->
        <div class="mx-8 h-5 bg-riso-walnut/30 rounded-t-lg border-2 border-riso-walnut/40" />
        <!-- Jar body -->
        <div class="relative border-2 border-riso-sage/30 rounded-b-[2rem] bg-gradient-to-b from-white/80 to-riso-sage/10 overflow-hidden">
          <!-- Glass reflection -->
          <div class="absolute top-0 left-3 w-3 h-full bg-white/30 rounded-full blur-sm" />
          <!-- Items grid inside jar -->
          <div class="grid grid-cols-2 gap-3 p-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div
              v-for="item in filteredItems"
              :key="item.name"
              class="group bg-white/70 backdrop-blur-sm rounded-2xl border border-riso-sage/20 p-3 text-center transition-all hover:-translate-y-1"
            >
              <div :class="['w-full aspect-square rounded-xl flex items-center justify-center text-3xl mb-2', item.bg]">
                <span class="animate-float">{{ item.icon }}</span>
              </div>
              <RarityBadge :rarity="item.rarity" />
              <p class="text-xs font-medium mt-1 text-riso-dark">{{ item.name }}</p>
              <div class="flex items-center justify-center gap-1 mt-1">
                <span class="text-xs">{{ item.priceIcon }}</span>
                <span class="text-xs font-bold text-riso-walnut">{{ item.price }}</span>
              </div>
              <button class="mt-2 w-full py-1.5 bg-riso-sage text-white text-xs font-medium rounded-lg riso-shadow-sm active:riso-shadow-press transition-all">
                담기
              </button>
            </div>
          </div>
        </div>
        <!-- Jar bottom reflection -->
        <div class="mx-4 h-2 bg-riso-sage/10 rounded-b-full" />
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 2. POSTCARD - Items as stamp cards on a postcard board              -->
    <!-- ================================================================== -->
    <div v-if="is('postcard')" class="px-4 py-4 space-y-4">
      <ShopWallet :tokens="tokens" />
      <ShopTabs v-model="selectedTab" :tabs="shopTabs" />

      <!-- Postcard board -->
      <div class="bg-riso-butter/40 rounded-2xl p-4 border border-riso-walnut/15 riso-grain">
        <!-- Pinboard header -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-lg">&#x1F4EC;</span>
          <h2 class="font-bold text-sm text-riso-walnut">Stamp Collection</h2>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="item in filteredItems"
            :key="item.name"
            class="relative bg-riso-cream rounded-lg overflow-hidden border border-dashed border-riso-walnut/25"
          >
            <!-- Stamp perforations (rarity indicator) -->
            <div
              :class="[
                'absolute top-0 left-0 right-0 h-2 flex justify-around items-center',
                item.rarity === 'EPIC' ? 'bg-riso-poppy/20' :
                item.rarity === 'RARE' ? 'bg-riso-navy/15' : 'bg-riso-walnut/10'
              ]"
            >
              <span v-for="n in 8" :key="n" class="w-1.5 h-1.5 rounded-full bg-riso-cream" />
            </div>
            <!-- Stamp content -->
            <div class="pt-4 p-3 text-center">
              <div :class="['w-16 h-16 mx-auto rounded-lg flex items-center justify-center text-3xl border-2 border-riso-walnut/10', item.bg]">
                {{ item.icon }}
              </div>
              <RarityBadge :rarity="item.rarity" class="mt-2" />
              <p class="text-xs font-medium mt-1 text-riso-dark">{{ item.name }}</p>
              <!-- Postmark-style price -->
              <div class="mt-2 inline-flex items-center gap-1 border border-riso-poppy/40 rounded-full px-2 py-0.5 rotate-[-3deg]">
                <span class="text-[10px] text-riso-poppy font-bold">{{ item.priceIcon }} {{ item.price }}</span>
              </div>
              <button class="mt-2 w-full py-1.5 bg-riso-terracotta text-white text-xs font-medium rounded-lg riso-shadow-sm active:riso-shadow-press">
                수집하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 3. SHELF - Wooden display cabinet / bookshelf                      -->
    <!-- ================================================================== -->
    <div v-if="is('shelf')" class="px-4 py-4 space-y-4">
      <ShopWallet :tokens="tokens" />
      <ShopTabs v-model="selectedTab" :tabs="shopTabs" />

      <!-- Wooden cabinet -->
      <div class="bg-riso-walnut/10 rounded-2xl border-2 border-riso-walnut/30 overflow-hidden">
        <!-- Cabinet top trim -->
        <div class="h-3 bg-gradient-to-b from-riso-walnut/40 to-riso-walnut/20" />

        <!-- Shelves -->
        <div
          v-for="(row, ri) in itemRows"
          :key="ri"
          class="relative"
        >
          <!-- Shelf items -->
          <div class="flex gap-3 px-4 py-3 justify-center">
            <div
              v-for="item in row"
              :key="item.name"
              class="w-24 text-center group"
            >
              <div :class="['w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110', item.bg]">
                <span class="animate-sway">{{ item.icon }}</span>
              </div>
              <RarityBadge :rarity="item.rarity" class="mt-1" />
              <p class="text-[10px] font-medium mt-0.5 text-riso-dark truncate">{{ item.name }}</p>
              <span class="text-[10px] font-bold text-riso-walnut">{{ item.priceIcon }} {{ item.price }}</span>
              <button class="mt-1 w-full py-1 bg-riso-walnut text-white text-[10px] font-medium rounded-md riso-shadow-sm active:riso-shadow-press">
                구매
              </button>
            </div>
          </div>
          <!-- Wooden shelf bar -->
          <div class="h-2.5 bg-gradient-to-b from-riso-walnut/50 to-riso-walnut/30 riso-shadow-sm" />
        </div>

        <!-- Cabinet bottom trim -->
        <div class="h-4 bg-gradient-to-t from-riso-walnut/40 to-riso-walnut/15" />
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 4. WINDOW - Store window display                                   -->
    <!-- ================================================================== -->
    <div v-if="is('window')" class="py-4 space-y-4">
      <!-- Sky gradient background -->
      <div class="mx-4 rounded-2xl overflow-hidden bg-gradient-to-b from-riso-sky/60 via-riso-sky/30 to-riso-cream border border-riso-navy/15">
        <!-- Sale banner -->
        <div class="bg-riso-poppy/90 text-white text-center py-2">
          <p class="text-xs font-bold tracking-wider animate-pulse">OPEN NOW</p>
        </div>

        <div class="px-4 py-3">
          <ShopWallet :tokens="tokens" />
        </div>

        <div class="px-4 pb-2">
          <ShopTabs v-model="selectedTab" :tabs="shopTabs" />
        </div>

        <!-- Window panes grid -->
        <div class="grid grid-cols-2 gap-px bg-riso-navy/20 mx-4 mb-4 rounded-xl overflow-hidden riso-shadow">
          <div
            v-for="item in filteredItems"
            :key="item.name"
            class="bg-white/80 backdrop-blur-sm p-3 text-center relative"
          >
            <!-- Glass shine -->
            <div class="absolute top-1 right-1 w-4 h-4 bg-white/60 rounded-full blur-sm" />
            <div :class="['w-14 h-14 mx-auto rounded-lg flex items-center justify-center text-2xl', item.bg]">
              {{ item.icon }}
            </div>
            <RarityBadge :rarity="item.rarity" class="mt-1" />
            <p class="text-[10px] font-medium mt-0.5 text-riso-dark">{{ item.name }}</p>
            <div class="flex items-center justify-center gap-1 mt-0.5">
              <span class="text-[10px] font-bold text-riso-navy">{{ item.priceIcon }} {{ item.price }}</span>
            </div>
            <button class="mt-1.5 w-full py-1 bg-riso-navy text-white text-[10px] font-medium rounded-md riso-shadow-sm active:riso-shadow-press">
              구매
            </button>
          </div>
        </div>

        <!-- Window sill -->
        <div class="h-3 bg-riso-walnut/30 rounded-b-2xl" />
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 5. GARDEN - Flower market map                                      -->
    <!-- ================================================================== -->
    <div v-if="is('garden')" class="px-4 py-4 space-y-4">
      <ShopWallet :tokens="tokens" />

      <!-- Garden map -->
      <div class="bg-riso-grass/15 rounded-2xl p-4 border border-riso-sage/30 riso-grain relative overflow-hidden">
        <!-- Winding path decorations -->
        <div class="absolute inset-0 opacity-20">
          <div class="absolute top-1/4 left-0 right-0 h-4 bg-riso-butter/60 rounded-full transform rotate-1" />
          <div class="absolute top-2/4 left-0 right-0 h-4 bg-riso-butter/60 rounded-full transform -rotate-1" />
          <div class="absolute top-3/4 left-0 right-0 h-4 bg-riso-butter/60 rounded-full transform rotate-2" />
        </div>

        <div class="relative z-10 space-y-6">
          <!-- Market stall per category -->
          <section v-for="cat in shopTabs.slice(1)" :key="cat">
            <!-- Stall header -->
            <div class="flex items-center gap-2 mb-2">
              <div class="w-6 h-6 bg-riso-forest/20 rounded-full flex items-center justify-center text-sm">
                {{ cat === '산책' ? '&#x1F6B6;' : cat === '독서' ? '&#x1F4D6;' : cat === '러닝' ? '&#x1F3C3;' : cat === '낙서' ? '&#x1F3A8;' : '&#x1FA99;' }}
              </div>
              <h3 class="text-xs font-bold text-riso-forest">{{ cat }} 가판대</h3>
            </div>

            <!-- Stall items (horizontal scroll) -->
            <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              <div
                v-for="item in shopItems"
                :key="cat + item.name"
                class="shrink-0 w-28 bg-white/80 backdrop-blur-sm rounded-xl border border-riso-sage/20 p-2 text-center"
              >
                <!-- Plant pot display -->
                <div class="relative">
                  <div :class="['w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl', item.bg]">
                    <span class="animate-sway">{{ item.icon }}</span>
                  </div>
                  <!-- Pot -->
                  <div class="w-10 h-3 mx-auto bg-riso-terracotta/40 rounded-b-lg -mt-1" />
                </div>
                <RarityBadge :rarity="item.rarity" class="mt-1" />
                <p class="text-[10px] font-medium text-riso-dark truncate">{{ item.name }}</p>
                <span class="text-[10px] font-bold text-riso-sage">{{ item.priceIcon }} {{ item.price }}</span>
                <button class="mt-1 w-full py-1 bg-riso-sage text-white text-[10px] font-medium rounded-md riso-shadow-sm active:riso-shadow-press">
                  심기
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 6. STORYBOOK - Magic shop in a fairytale                           -->
    <!-- ================================================================== -->
    <div v-if="is('storybook')" class="px-4 py-4 space-y-4">
      <ShopWallet :tokens="tokens" />
      <ShopTabs v-model="selectedTab" :tabs="shopTabs" />

      <!-- Storybook page frame -->
      <div class="bg-riso-butter/50 rounded-2xl border-2 border-riso-walnut/30 overflow-hidden riso-grain">
        <!-- Page header ornament -->
        <div class="text-center py-3 border-b border-riso-walnut/15">
          <p class="text-[10px] text-riso-walnut/50 tracking-widest uppercase">Chapter IV</p>
          <h2 class="font-bold text-sm text-riso-walnut mt-0.5">마법사의 가게</h2>
          <div class="flex justify-center gap-1 mt-1">
            <span v-for="n in 3" :key="n" class="w-1 h-1 rounded-full bg-riso-walnut/30" />
          </div>
        </div>

        <!-- Enchanted items on old wooden tables -->
        <div class="p-4 space-y-3">
          <div
            v-for="item in filteredItems"
            :key="item.name"
            class="flex items-center gap-3 bg-riso-cream/60 rounded-xl p-3 border border-riso-walnut/15"
          >
            <!-- Enchanted object -->
            <div :class="['w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 border border-riso-walnut/10', item.bg]">
              <span class="animate-float">{{ item.icon }}</span>
            </div>
            <!-- Description -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-xs font-bold text-riso-walnut">{{ item.name }}</p>
                <RarityBadge :rarity="item.rarity" />
              </div>
              <p class="text-[10px] text-riso-walnut/50 mt-0.5 italic">
                {{ item.rarity === 'EPIC' ? '전설의 마법이 깃든 물건' : item.rarity === 'RARE' ? '희귀한 숲의 선물' : '평범하지만 소중한 것' }}
              </p>
              <div class="flex items-center justify-between mt-1.5">
                <span class="text-xs font-bold text-riso-terracotta">{{ item.priceIcon }} {{ item.price }}</span>
                <button class="px-3 py-1 bg-riso-terracotta text-white text-[10px] font-medium rounded-lg riso-shadow-sm active:riso-shadow-press">
                  획득
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Page footer -->
        <div class="text-center pb-3 border-t border-riso-walnut/10 pt-2">
          <p class="text-[10px] text-riso-walnut/30 italic">~ to be continued ~</p>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 7. WINDOWSILL - Garden center shelves (clean, minimal)             -->
    <!-- ================================================================== -->
    <div v-if="is('windowsill')" class="px-4 py-4 space-y-4">
      <ShopWallet :tokens="tokens" />
      <ShopTabs v-model="selectedTab" :tabs="shopTabs" />

      <!-- Clean plant shelf display -->
      <div class="space-y-1">
        <div
          v-for="(row, ri) in itemRows"
          :key="ri"
        >
          <!-- Shelf row -->
          <div class="flex gap-2 px-2 py-3 justify-around">
            <div
              v-for="item in row"
              :key="item.name"
              class="flex-1 max-w-[7rem] bg-white rounded-xl border border-riso-sage/15 p-2.5 text-center"
            >
              <div :class="['w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-2xl', item.bg]">
                {{ item.icon }}
              </div>
              <p class="text-[10px] font-medium mt-1.5 text-riso-dark">{{ item.name }}</p>
              <RarityBadge :rarity="item.rarity" class="mt-0.5" />
              <!-- Price tag (clean style) -->
              <div class="mt-1.5 bg-riso-cream rounded-md px-2 py-0.5 inline-flex items-center gap-0.5">
                <span class="text-[10px]">{{ item.priceIcon }}</span>
                <span class="text-[10px] font-bold text-riso-dark">{{ item.price }}</span>
              </div>
              <button class="mt-2 w-full py-1.5 bg-riso-sage text-white text-[10px] font-medium rounded-lg active:riso-shadow-press transition-all">
                구매
              </button>
            </div>
          </div>
          <!-- Thin shelf divider -->
          <div class="h-1 bg-riso-walnut/15 rounded-full mx-4" />
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 8. BUBBLE - Items floating as bubbles (rarity = size)              -->
    <!-- ================================================================== -->
    <div v-if="is('bubble')" class="px-4 py-4 space-y-4">
      <ShopWallet :tokens="tokens" />
      <ShopTabs v-model="selectedTab" :tabs="shopTabs" />

      <!-- Bubble field -->
      <div class="relative min-h-[65vh] bg-gradient-to-b from-riso-sky/20 via-riso-lavender/10 to-riso-cream rounded-2xl overflow-hidden p-4">
        <!-- Background decoration bubbles -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-[10%] left-[5%] w-8 h-8 rounded-full bg-riso-sky/20 animate-float" />
          <div class="absolute top-[30%] right-[8%] w-5 h-5 rounded-full bg-riso-lavender/20 animate-float" style="animation-delay: -1s" />
          <div class="absolute top-[60%] left-[15%] w-6 h-6 rounded-full bg-riso-pink/15 animate-float" style="animation-delay: -2s" />
          <div class="absolute top-[80%] right-[20%] w-4 h-4 rounded-full bg-riso-sky/15 animate-float" style="animation-delay: -0.5s" />
        </div>

        <!-- Item bubbles -->
        <div class="relative z-10 flex flex-wrap justify-center gap-3 items-center">
          <button
            v-for="item in filteredItems"
            :key="item.name"
            :class="[
              'rounded-full flex flex-col items-center justify-center border-2 transition-all active:scale-95',
              'bg-white/70 backdrop-blur-sm animate-float',
              item.rarity === 'EPIC'
                ? 'w-32 h-32 border-riso-poppy/30 riso-shadow'
                : item.rarity === 'RARE'
                  ? 'w-26 h-26 border-riso-navy/25 riso-shadow-sm'
                  : 'w-22 h-22 border-riso-sage/20'
            ]"
            :style="{ animationDelay: `-${Math.random() * 3}s` }"
            @click="selectedBubble = selectedBubble === item.name ? null : item.name"
          >
            <span :class="[item.rarity === 'EPIC' ? 'text-3xl' : item.rarity === 'RARE' ? 'text-2xl' : 'text-xl']">
              {{ item.icon }}
            </span>
            <span class="text-[9px] font-medium text-riso-dark/70 mt-0.5">{{ item.name }}</span>
            <RarityBadge :rarity="item.rarity" class="mt-0.5 scale-75" />
          </button>
        </div>

        <!-- Bubble detail popup -->
        <Transition name="fade">
          <div
            v-if="selectedBubbleItem"
            class="fixed inset-x-4 bottom-24 z-50 bg-white rounded-2xl riso-shadow p-4"
          >
            <div class="flex items-center gap-3">
              <div :class="['w-16 h-16 rounded-xl flex items-center justify-center text-3xl', selectedBubbleItem.bg]">
                {{ selectedBubbleItem.icon }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-bold text-sm text-riso-dark">{{ selectedBubbleItem.name }}</p>
                  <RarityBadge :rarity="selectedBubbleItem.rarity" />
                </div>
                <div class="flex items-center gap-1 mt-1">
                  <span class="text-sm">{{ selectedBubbleItem.priceIcon }}</span>
                  <span class="text-sm font-bold text-riso-navy">{{ selectedBubbleItem.price }}</span>
                </div>
              </div>
              <button
                class="px-4 py-2 bg-riso-navy text-white text-xs font-bold rounded-xl riso-shadow-sm active:riso-shadow-press"
                @click="selectedBubble = null"
              >
                구매
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { is } = useLayoutVariant()

const selectedTab = ref('전체')
const selectedBubble = ref<string | null>(null)

// ---------- Mock Data ----------
const tokens = [
  { name: '산책', icon: '🚶', amount: 25 },
  { name: '독서', icon: '📖', amount: 15 },
  { name: '러닝', icon: '🏃', amount: 10 },
]

const shopItems = [
  { name: '작은 풀', icon: '🌿', rarity: 'COMMON', price: 30, priceIcon: '🪙', bg: 'bg-green-50' },
  { name: '빨간 버섯', icon: '🍄', rarity: 'RARE', price: 15, priceIcon: '🚶', bg: 'bg-red-50' },
  { name: '돌멩이', icon: '🪨', rarity: 'COMMON', price: 20, priceIcon: '🪙', bg: 'bg-gray-50' },
  { name: '해바라기', icon: '🌻', rarity: 'EPIC', price: 50, priceIcon: '🪙', bg: 'bg-yellow-50' },
  { name: '작은 나무', icon: '🌲', rarity: 'RARE', price: 20, priceIcon: '🚶', bg: 'bg-green-50' },
  { name: '조약돌', icon: '🫧', rarity: 'COMMON', price: 10, priceIcon: '🪙', bg: 'bg-blue-50' },
]

const shopTabs = ['전체', '산책', '독서', '러닝', '낙서', '범용']

// ---------- Computed ----------
const filteredItems = computed(() => {
  if (selectedTab.value === '전체') return shopItems
  return shopItems // In real app: filter by category
})

/** Split items into rows of 3 for shelf / windowsill layouts */
const itemRows = computed(() => {
  const rows: typeof shopItems[] = []
  const items = filteredItems.value
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3))
  }
  return rows
})

const selectedBubbleItem = computed(() => {
  if (!selectedBubble.value) return null
  return shopItems.find(i => i.name === selectedBubble.value) ?? null
})
</script>

<!-- ======================================= -->
<!-- Inline sub-components (SFC style)       -->
<!-- ======================================= -->
<script lang="ts">
/**
 * ShopWallet - Displays coin balance + token balances
 */
const ShopWallet = defineComponent({
  name: 'ShopWallet',
  props: {
    tokens: { type: Array as PropType<{ name: string; icon: string; amount: number }[]>, required: true },
  },
  setup(props) {
    return () =>
      h('div', { class: 'flex gap-2 overflow-x-auto pb-1 scrollbar-hide' }, [
        h('div', { class: 'bg-riso-butter/60 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0 border border-riso-walnut/10' }, [
          h('span', { class: 'text-sm' }, '🪙'),
          h('span', { class: 'text-sm font-bold text-riso-walnut' }, '150'),
        ]),
        ...props.tokens.map(t =>
          h('div', {
            key: t.name,
            class: 'bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-riso-walnut/10 shrink-0',
          }, [
            h('span', { class: 'text-sm' }, t.icon),
            h('span', { class: 'text-xs text-riso-dark/40' }, t.name),
            h('span', { class: 'text-sm font-bold text-riso-dark' }, String(t.amount)),
          ]),
        ),
      ])
  },
})

/**
 * ShopTabs - Category filter tabs
 */
const ShopTabs = defineComponent({
  name: 'ShopTabs',
  props: {
    modelValue: { type: String, required: true },
    tabs: { type: Array as PropType<string[]>, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'flex gap-2 overflow-x-auto pb-1 scrollbar-hide' },
        props.tabs.map(tab =>
          h('button', {
            key: tab,
            class: [
              'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
              props.modelValue === tab
                ? 'bg-riso-navy text-white riso-shadow-sm'
                : 'bg-white/70 text-riso-dark/50 border border-riso-walnut/15',
            ],
            onClick: () => emit('update:modelValue', tab),
          }, tab),
        ),
      )
  },
})

/**
 * RarityBadge - Rarity tag display
 */
const RarityBadge = defineComponent({
  name: 'RarityBadge',
  props: {
    rarity: { type: String, required: true },
  },
  setup(props) {
    const cls = computed(() => {
      switch (props.rarity) {
        case 'EPIC': return 'bg-riso-poppy/15 text-riso-poppy border-riso-poppy/20'
        case 'RARE': return 'bg-riso-navy/10 text-riso-navy border-riso-navy/20'
        default: return 'bg-riso-walnut/10 text-riso-walnut/70 border-riso-walnut/15'
      }
    })
    return () =>
      h('span', {
        class: ['inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border', cls.value],
      }, props.rarity)
  },
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Bubble sizes that Tailwind may not generate */
.w-22 { width: 5.5rem; }
.h-22 { height: 5.5rem; }
.w-26 { width: 6.5rem; }
.h-26 { height: 6.5rem; }
</style>
