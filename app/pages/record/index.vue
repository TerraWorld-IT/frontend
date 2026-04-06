<template>
  <div class="py-6 space-y-6">
    <!-- Layout A/B 토글 -->
    <div class="flex justify-center gap-2">
      <button
        v-for="v in ['A', 'B']"
        :key="v"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition',
          variant === v ? 'bg-riso-blue text-white' : 'bg-gray-100 text-gray-500'
        ]"
        @click="variant = v"
      >
        레이아웃 {{ v }}
      </button>
    </div>

    <!-- ========== Layout A: 캘린더 중심 ========== -->
    <template v-if="variant === 'A'">
      <!-- 월 네비게이션 -->
      <div class="flex items-center justify-between">
        <button class="text-riso-dark/40">&lt;</button>
        <h2 class="font-bold">2026년 4월</h2>
        <button class="text-riso-dark/40">&gt;</button>
      </div>

      <!-- 캘린더 그리드 -->
      <div class="bg-white rounded-2xl p-4 border border-gray-100">
        <div class="grid grid-cols-7 gap-1 text-center text-xs text-riso-dark/40 mb-2">
          <span v-for="d in ['일','월','화','수','목','금','토']" :key="d">{{ d }}</span>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center">
          <template v-for="i in 30" :key="i">
            <div
              :class="[
                'py-2 rounded-lg text-sm relative',
                i === 7 ? 'bg-riso-green/20 font-bold' : 'hover:bg-gray-50',
                [6, 7, 12, 13, 14, 20, 25].includes(i) ? 'font-medium' : 'text-riso-dark/60'
              ]"
            >
              {{ i }}
              <!-- 기록 있는 날 도트 -->
              <div
                v-if="[6, 7, 12, 13, 14, 20, 25].includes(i)"
                class="flex justify-center gap-0.5 mt-0.5"
              >
                <span class="w-1 h-1 rounded-full bg-riso-green" />
                <span v-if="[7, 14].includes(i)" class="w-1 h-1 rounded-full bg-riso-blue" />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 오늘 기록 리스트 -->
      <section>
        <h3 class="text-sm font-bold mb-3">4월 7일 기록</h3>
        <div class="space-y-2">
          <div class="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
            <span class="text-xl">🚶</span>
            <div class="flex-1">
              <p class="text-sm font-medium">산책 30분</p>
              <p class="text-xs text-riso-dark/40">한강 산책로 걸음</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-riso-green font-medium">+10 코인</p>
              <p class="text-xs text-riso-dark/30">+5 토큰</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 통계 미니 -->
      <section class="flex gap-3">
        <div class="flex-1 bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p class="text-2xl font-bold text-riso-green">7</p>
          <p class="text-xs text-riso-dark/40">이번 달 기록</p>
        </div>
        <div class="flex-1 bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p class="text-2xl font-bold text-riso-orange">3</p>
          <p class="text-xs text-riso-dark/40">연속 기록일</p>
        </div>
      </section>
    </template>

    <!-- ========== Layout B: 리스트 중심 (인스타 피드형) ========== -->
    <template v-else>
      <!-- 탭: 전체 / 카테고리별 -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        <button
          v-for="tab in ['전체', '산책', '독서', '러닝', '낙서']"
          :key="tab"
          :class="[
            'px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition',
            selectedTab === tab ? 'bg-riso-dark text-white' : 'bg-gray-100 text-riso-dark/60'
          ]"
          @click="selectedTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- 타임라인 리스트 -->
      <div class="space-y-4">
        <div v-for="record in sampleRecords" :key="record.id" class="bg-white rounded-2xl p-4 border border-gray-100">
          <div class="flex items-start gap-3">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-lg', record.bg]">
              {{ record.icon }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-medium text-sm">{{ record.category }}</p>
                  <p class="text-xs text-riso-dark/40">{{ record.date }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-riso-green font-medium">+{{ record.coin }} 코인</p>
                </div>
              </div>
              <p v-if="record.memo" class="text-sm text-riso-dark/70 mt-2">{{ record.memo }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 미니 캘린더 (하단 고정) -->
      <div class="bg-white rounded-2xl p-3 border border-gray-100">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold">4월</span>
          <span class="text-xs text-riso-dark/40">7일 기록 완료</span>
        </div>
        <div class="flex gap-1">
          <div
            v-for="i in 30"
            :key="i"
            :class="[
              'flex-1 h-3 rounded-sm',
              [6, 7, 12, 13, 14, 20, 25].includes(i) ? 'bg-riso-green' : 'bg-gray-100'
            ]"
          />
        </div>
      </div>
    </template>

    <!-- FAB: 기록 추가 -->
    <button class="fixed bottom-20 right-4 w-14 h-14 bg-riso-green text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40">
      +
    </button>
  </div>
</template>

<script setup lang="ts">
const variant = ref<'A' | 'B'>('A')
const selectedTab = ref('전체')

const sampleRecords = [
  { id: 1, category: '산책', icon: '🚶', date: '4월 7일 09:30', memo: '한강 산책로 30분 걸음', coin: 10, bg: 'bg-green-50' },
  { id: 2, category: '독서', icon: '📖', date: '4월 6일 21:00', memo: '아토믹 해빗 3장 읽음', coin: 10, bg: 'bg-blue-50' },
  { id: 3, category: '러닝', icon: '🏃', date: '4월 6일 07:00', memo: '5km 달림', coin: 15, bg: 'bg-red-50' },
  { id: 4, category: '산책', icon: '🚶', date: '4월 5일 18:00', memo: '', coin: 10, bg: 'bg-green-50' },
  { id: 5, category: '낙서', icon: '🎨', date: '4월 5일 15:00', memo: '고양이 스케치', coin: 10, bg: 'bg-orange-50' },
]
</script>
