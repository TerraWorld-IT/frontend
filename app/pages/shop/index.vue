<template>
  <div class="py-6 space-y-4">
    <!-- Layout A/B 토글 -->
    <div class="flex justify-center gap-2">
      <button
        v-for="v in ['A', 'B']"
        :key="v"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition',
          variant === v ? 'bg-riso-orange text-white' : 'bg-gray-100 text-gray-500'
        ]"
        @click="variant = v"
      >
        레이아웃 {{ v }}
      </button>
    </div>

    <!-- 잔고 표시 -->
    <div class="flex gap-2 overflow-x-auto pb-1">
      <div class="bg-yellow-50 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
        <span class="text-sm">🪙</span>
        <span class="text-sm font-bold">150</span>
      </div>
      <div v-for="token in tokens" :key="token.name" class="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-gray-100 shrink-0">
        <span class="text-sm">{{ token.icon }}</span>
        <span class="text-xs text-riso-dark/40">{{ token.name }}</span>
        <span class="text-sm font-bold">{{ token.amount }}</span>
      </div>
    </div>

    <!-- ========== Layout A: 그리드형 ========== -->
    <template v-if="variant === 'A'">
      <!-- 카테고리 탭 -->
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in shopTabs"
          :key="tab"
          :class="[
            'px-4 py-1.5 rounded-full text-sm whitespace-nowrap',
            selectedTab === tab ? 'bg-riso-dark text-white' : 'bg-gray-100 text-riso-dark/60'
          ]"
          @click="selectedTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- 아이템 그리드 (2열) -->
      <div class="grid grid-cols-2 gap-3">
        <div v-for="item in shopItems" :key="item.name" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div :class="['aspect-square flex items-center justify-center text-4xl', item.bg]">
            {{ item.icon }}
          </div>
          <div class="p-3">
            <div class="flex items-center gap-1 mb-1">
              <span
                :class="[
                  'text-xs px-1.5 py-0.5 rounded',
                  item.rarity === 'RARE' ? 'bg-blue-100 text-blue-600' :
                  item.rarity === 'EPIC' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-500'
                ]"
              >
                {{ item.rarity }}
              </span>
            </div>
            <p class="font-medium text-sm">{{ item.name }}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-sm font-bold text-riso-orange">{{ item.priceIcon }} {{ item.price }}</span>
              <button class="px-3 py-1 bg-riso-green text-white rounded-lg text-xs font-medium">
                구매
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== Layout B: 리스트형 (가로 스크롤 섹션) ========== -->
    <template v-else>
      <!-- 추천 (배너) -->
      <section>
        <div class="bg-gradient-to-r from-riso-pink/30 to-riso-cream rounded-2xl p-5">
          <p class="text-xs text-riso-dark/40">이번 주 추천</p>
          <p class="font-bold mt-1">봄맞이 꽃 컬렉션 🌸</p>
          <p class="text-xs text-riso-dark/50 mt-1">리소 느낌의 따뜻한 봄 아이템</p>
        </div>
      </section>

      <!-- 카테고리별 가로 스크롤 -->
      <section v-for="cat in categoryShop" :key="cat.title">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-sm">{{ cat.icon }} {{ cat.title }}</h3>
          <button class="text-xs text-riso-dark/40">전체보기 ›</button>
        </div>
        <div class="flex gap-3 overflow-x-auto pb-2">
          <div
            v-for="item in cat.items"
            :key="item.name"
            class="shrink-0 w-32 bg-white rounded-xl border border-gray-100 overflow-hidden"
          >
            <div :class="['h-28 flex items-center justify-center text-3xl', item.bg]">
              {{ item.icon }}
            </div>
            <div class="p-2">
              <p class="text-xs font-medium truncate">{{ item.name }}</p>
              <p class="text-xs font-bold text-riso-orange mt-1">{{ item.priceIcon }} {{ item.price }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const variant = ref<'A' | 'B'>('A')
const selectedTab = ref('전체')

const tokens = [
  { name: '산책', icon: '🚶', amount: 25 },
  { name: '독서', icon: '📖', amount: 15 },
  { name: '러닝', icon: '🏃', amount: 10 },
]

const shopTabs = ['전체', '산책', '독서', '러닝', '낙서', '범용']

const shopItems = [
  { name: '작은 풀', icon: '🌿', rarity: 'COMMON', price: 30, priceIcon: '🪙', bg: 'bg-green-50' },
  { name: '빨간 버섯', icon: '🍄', rarity: 'RARE', price: 15, priceIcon: '🚶', bg: 'bg-red-50' },
  { name: '돌멩이', icon: '🪨', rarity: 'COMMON', price: 20, priceIcon: '🪙', bg: 'bg-gray-50' },
  { name: '해바라기', icon: '🌻', rarity: 'EPIC', price: 50, priceIcon: '🪙', bg: 'bg-yellow-50' },
  { name: '작은 나무', icon: '🌲', rarity: 'RARE', price: 20, priceIcon: '🚶', bg: 'bg-green-50' },
  { name: '조약돌', icon: '🫧', rarity: 'COMMON', price: 10, priceIcon: '🪙', bg: 'bg-blue-50' },
]

const categoryShop = [
  {
    title: '산책 아이템', icon: '🚶',
    items: [
      { name: '작은 풀', icon: '🌿', price: '5 토큰', priceIcon: '🚶', bg: 'bg-green-50' },
      { name: '나뭇잎', icon: '🍃', price: '8 토큰', priceIcon: '🚶', bg: 'bg-green-50' },
      { name: '작은 나무', icon: '🌲', price: '20 토큰', priceIcon: '🚶', bg: 'bg-green-50' },
    ]
  },
  {
    title: '독서 아이템', icon: '📖',
    items: [
      { name: '작은 책', icon: '📚', price: '5 토큰', priceIcon: '📖', bg: 'bg-blue-50' },
      { name: '독서등', icon: '💡', price: '15 토큰', priceIcon: '📖', bg: 'bg-blue-50' },
    ]
  },
  {
    title: '범용 아이템', icon: '🪙',
    items: [
      { name: '돌멩이', icon: '🪨', price: '20 코인', priceIcon: '🪙', bg: 'bg-gray-50' },
      { name: '조약돌', icon: '🫧', price: '10 코인', priceIcon: '🪙', bg: 'bg-blue-50' },
      { name: '해바라기', icon: '🌻', price: '50 코인', priceIcon: '🪙', bg: 'bg-yellow-50' },
    ]
  },
]
</script>
