<template>
  <div class="py-6 space-y-5">
    <!-- Layout A/B 토글 -->
    <div class="flex justify-center gap-2">
      <button
        v-for="v in ['A', 'B']"
        :key="v"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition',
          variant === v ? 'bg-riso-red text-white' : 'bg-gray-100 text-gray-500'
        ]"
        @click="variant = v"
      >
        레이아웃 {{ v }}
      </button>
    </div>

    <!-- ========== Layout A: 카드형 ========== -->
    <template v-if="variant === 'A'">
      <!-- 프로필 헤더 -->
      <section class="text-center">
        <div class="w-20 h-20 mx-auto bg-riso-pink/30 rounded-full flex items-center justify-center text-3xl">
          🌱
        </div>
        <h2 class="font-bold text-lg mt-3">테라가드너</h2>
        <p class="text-sm text-riso-dark/40">terraplanter@email.com</p>
      </section>

      <!-- 레벨 카드 -->
      <section class="bg-white rounded-2xl p-4 border border-gray-100">
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold">Lv.3</span>
          <span class="text-xs text-riso-dark/40">300 / 600 EXP</span>
        </div>
        <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-riso-green to-riso-blue rounded-full" style="width: 50%" />
        </div>
        <p class="text-xs text-riso-dark/30 mt-2">다음 레벨: 배경 "둥근 어항" 해금</p>
      </section>

      <!-- 통계 그리드 -->
      <section class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p class="text-2xl font-bold text-riso-green">42</p>
          <p class="text-xs text-riso-dark/40 mt-1">총 기록 수</p>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p class="text-2xl font-bold text-riso-orange">7</p>
          <p class="text-xs text-riso-dark/40 mt-1">연속 기록일</p>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p class="text-2xl font-bold text-riso-blue">12</p>
          <p class="text-xs text-riso-dark/40 mt-1">보유 아이템</p>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p class="text-2xl font-bold text-riso-pink">3</p>
          <p class="text-xs text-riso-dark/40 mt-1">공유 횟수</p>
        </div>
      </section>

      <!-- 카테고리별 기록 분포 -->
      <section class="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 class="font-bold text-sm mb-3">카테고리 분포</h3>
        <div class="space-y-3">
          <div v-for="stat in categoryStats" :key="stat.name" class="flex items-center gap-3">
            <span class="text-lg w-8">{{ stat.icon }}</span>
            <div class="flex-1">
              <div class="flex justify-between text-xs mb-1">
                <span>{{ stat.name }}</span>
                <span class="text-riso-dark/40">{{ stat.count }}회</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div :class="['h-full rounded-full', stat.color]" :style="{ width: stat.percent + '%' }" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 설정 메뉴 -->
      <section class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>닉네임 변경</span>
          <span class="text-riso-dark/30">›</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm flex justify-between items-center">
          <span>알림 설정</span>
          <span class="text-riso-dark/30">›</span>
        </button>
        <button class="w-full px-4 py-3.5 text-left text-sm text-riso-red">
          로그아웃
        </button>
      </section>
    </template>

    <!-- ========== Layout B: 풀 스크롤형 ========== -->
    <template v-else>
      <!-- 프로필 배너 -->
      <section class="bg-gradient-to-br from-riso-green/20 to-riso-blue/20 rounded-2xl p-5">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
            🌱
          </div>
          <div class="flex-1">
            <h2 class="font-bold text-lg">테라가드너</h2>
            <p class="text-xs text-riso-dark/40">가입 14일째 · 기록 42회</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs bg-riso-green/20 text-riso-green px-2 py-0.5 rounded-full font-medium">Lv.3</span>
              <span class="text-xs text-riso-dark/30">300/600 EXP</span>
            </div>
          </div>
          <button class="text-xs text-riso-dark/40">수정</button>
        </div>
      </section>

      <!-- 재화 현황 -->
      <section>
        <h3 class="font-bold text-sm mb-3">재화</h3>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-yellow-50 rounded-xl p-3 flex items-center gap-2">
            <span>🪙</span>
            <div>
              <p class="text-xs text-riso-dark/40">기본 코인</p>
              <p class="font-bold">1,520</p>
            </div>
          </div>
          <div v-for="token in tokenList" :key="token.name" class="bg-white rounded-xl p-3 flex items-center gap-2 border border-gray-100">
            <span>{{ token.icon }}</span>
            <div>
              <p class="text-xs text-riso-dark/40">{{ token.name }}</p>
              <p class="font-bold">{{ token.amount }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 수집률 -->
      <section class="bg-white rounded-2xl p-4 border border-gray-100">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-sm">아이템 수집률</h3>
          <span class="text-xs text-riso-dark/40">12 / 30</span>
        </div>
        <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-riso-orange rounded-full" style="width: 40%" />
        </div>
        <div class="flex justify-between text-xs text-riso-dark/30 mt-2">
          <span>COMMON 8/15</span>
          <span>RARE 3/10</span>
          <span>EPIC 1/5</span>
        </div>
      </section>

      <!-- 주간 기록 히트맵 -->
      <section class="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 class="font-bold text-sm mb-3">최근 4주 기록</h3>
        <div class="grid grid-cols-7 gap-1.5">
          <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-center text-xs text-riso-dark/30">{{ d }}</span>
          <template v-for="i in 28" :key="i">
            <div
              :class="[
                'aspect-square rounded-sm',
                Math.random() > 0.5 ? 'bg-riso-green' :
                Math.random() > 0.3 ? 'bg-riso-green/40' : 'bg-gray-100'
              ]"
            />
          </template>
        </div>
      </section>

      <!-- 설정 -->
      <section class="space-y-1">
        <button class="w-full bg-white rounded-xl px-4 py-3 text-left text-sm border border-gray-100 flex justify-between">
          <span>설정</span><span class="text-riso-dark/30">›</span>
        </button>
        <button class="w-full bg-white rounded-xl px-4 py-3 text-left text-sm border border-gray-100 text-riso-red">
          로그아웃
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const variant = ref<'A' | 'B'>('A')

const categoryStats = [
  { name: '산책', icon: '🚶', count: 18, percent: 43, color: 'bg-riso-green' },
  { name: '독서', icon: '📖', count: 12, percent: 29, color: 'bg-riso-blue' },
  { name: '러닝', icon: '🏃', count: 8, percent: 19, color: 'bg-riso-red' },
  { name: '낙서', icon: '🎨', count: 4, percent: 10, color: 'bg-riso-orange' },
]

const tokenList = [
  { name: '산책토큰', icon: '🚶', amount: 45 },
  { name: '독서토큰', icon: '📖', amount: 30 },
  { name: '러닝토큰', icon: '🏃', amount: 20 },
  { name: '낙서토큰', icon: '🎨', amount: 10 },
]
</script>
