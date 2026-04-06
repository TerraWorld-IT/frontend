<template>
  <div class="py-6 space-y-6">
    <!-- Layout A/B 토글 -->
    <div class="flex justify-center gap-2 mb-4">
      <button
        v-for="v in ['A', 'B']"
        :key="v"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition',
          variant === v ? 'bg-riso-green text-white' : 'bg-gray-100 text-gray-500'
        ]"
        @click="variant = v"
      >
        레이아웃 {{ v }}
      </button>
    </div>

    <!-- ========== Layout A: 테라리움 중심 ========== -->
    <template v-if="variant === 'A'">
      <!-- 테라리움 미리보기 (히어로) -->
      <section class="relative mx-auto w-72 h-72 bg-riso-cream border-2 border-riso-pink/30 rounded-3xl flex items-center justify-center">
        <div class="text-center text-riso-dark/30">
          <div class="text-5xl mb-2">🫧</div>
          <p class="text-sm">내 테라리움</p>
          <p class="text-xs text-riso-dark/20">Lv.1 · 아이템 0개</p>
        </div>
      </section>

      <!-- 경험치 바 -->
      <div class="px-2">
        <div class="flex justify-between text-xs text-riso-dark/50 mb-1">
          <span>Lv.1</span>
          <span>0 / 100 EXP</span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-riso-green rounded-full" style="width: 0%" />
        </div>
      </div>

      <!-- 오늘 기록 -->
      <section>
        <h2 class="text-sm font-bold mb-3">오늘의 기록</h2>
        <div class="grid grid-cols-4 gap-3">
          <div v-for="cat in categories" :key="cat.name" class="text-center">
            <div
              :class="['w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl', cat.bg]"
            >
              {{ cat.icon }}
            </div>
            <p class="text-xs mt-1.5 text-riso-dark/60">{{ cat.name }}</p>
            <p class="text-xs font-bold">0회</p>
          </div>
        </div>
      </section>

      <!-- 퀵 기록 버튼 -->
      <button class="w-full py-3.5 bg-riso-green text-white rounded-2xl font-bold text-sm">
        + 기록하기
      </button>

      <!-- 재화 요약 -->
      <section class="flex gap-3">
        <div class="flex-1 bg-white rounded-xl p-3 border border-gray-100">
          <p class="text-xs text-riso-dark/40">기본 코인</p>
          <p class="text-lg font-bold">0</p>
        </div>
        <div class="flex-1 bg-white rounded-xl p-3 border border-gray-100">
          <p class="text-xs text-riso-dark/40">보유 아이템</p>
          <p class="text-lg font-bold">0개</p>
        </div>
      </section>
    </template>

    <!-- ========== Layout B: 기록 중심 ========== -->
    <template v-else>
      <!-- 인사 + 날씨 감성 -->
      <section class="text-center py-4">
        <p class="text-riso-dark/40 text-sm">2026년 4월 7일 월요일</p>
        <h1 class="text-xl font-bold mt-1">오늘도 좋은 하루 🌱</h1>
      </section>

      <!-- 카드형 기록 입력 -->
      <section class="space-y-3">
        <div
          v-for="cat in categories"
          :key="cat.name"
          :class="['flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent hover:border-riso-green/30 transition', cat.cardBg]"
        >
          <div class="text-3xl">{{ cat.icon }}</div>
          <div class="flex-1">
            <p class="font-bold text-sm">{{ cat.name }}</p>
            <p class="text-xs text-riso-dark/40">오늘 0회 · {{ cat.token }} 0개</p>
          </div>
          <button class="px-4 py-2 bg-white rounded-xl text-sm font-medium border border-gray-200">
            기록
          </button>
        </div>
      </section>

      <!-- 미니 테라리움 + 재화 -->
      <section class="flex gap-3">
        <div class="flex-1 bg-white rounded-2xl p-4 border border-gray-100 text-center">
          <div class="w-20 h-20 mx-auto bg-riso-cream rounded-xl flex items-center justify-center text-3xl mb-2">
            🫧
          </div>
          <p class="text-xs text-riso-dark/40">내 테라리움</p>
        </div>
        <div class="flex-1 space-y-2">
          <div class="bg-white rounded-xl p-3 border border-gray-100">
            <p class="text-xs text-riso-dark/40">코인</p>
            <p class="font-bold">0</p>
          </div>
          <div class="bg-white rounded-xl p-3 border border-gray-100">
            <p class="text-xs text-riso-dark/40">Lv.1</p>
            <div class="h-1.5 bg-gray-100 rounded-full mt-1">
              <div class="h-full bg-riso-green rounded-full" style="width: 0%" />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const variant = ref<'A' | 'B'>('A')

const categories = [
  { name: '산책', icon: '🚶', token: '산책토큰', bg: 'bg-green-50', cardBg: 'bg-green-50/50' },
  { name: '독서', icon: '📖', token: '독서토큰', bg: 'bg-blue-50', cardBg: 'bg-blue-50/50' },
  { name: '러닝', icon: '🏃', token: '러닝토큰', bg: 'bg-red-50', cardBg: 'bg-red-50/50' },
  { name: '낙서', icon: '🎨', token: '낙서토큰', bg: 'bg-orange-50', cardBg: 'bg-orange-50/50' },
]
</script>
