<template>
  <div class="py-6 space-y-4">
    <!-- Layout A/B 토글 -->
    <div class="flex justify-center gap-2">
      <button
        v-for="v in ['A', 'B']"
        :key="v"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition',
          variant === v ? 'bg-riso-pink text-white' : 'bg-gray-100 text-gray-500'
        ]"
        @click="variant = v"
      >
        레이아웃 {{ v }}
      </button>
    </div>

    <!-- ========== Layout A: 전체 캔버스 중심 ========== -->
    <template v-if="variant === 'A'">
      <!-- 모드 토글 -->
      <div class="flex justify-between items-center">
        <h2 class="font-bold">내 테라리움</h2>
        <div class="flex gap-2">
          <button
            :class="['px-3 py-1 rounded-lg text-xs', mode === 'view' ? 'bg-riso-dark text-white' : 'bg-gray-100']"
            @click="mode = 'view'"
          >
            감상
          </button>
          <button
            :class="['px-3 py-1 rounded-lg text-xs', mode === 'edit' ? 'bg-riso-dark text-white' : 'bg-gray-100']"
            @click="mode = 'edit'"
          >
            꾸미기
          </button>
        </div>
      </div>

      <!-- 캔버스 영역 (1:1) -->
      <div class="relative aspect-square bg-riso-cream rounded-3xl border-2 border-riso-pink/20 overflow-hidden">
        <!-- 유리병 프레임 (placeholder) -->
        <div class="absolute inset-4 border-2 border-riso-dark/10 rounded-[2rem] flex items-end justify-center pb-8">
          <!-- 배치된 아이템들 placeholder -->
          <div class="absolute" style="left: 30%; top: 40%">
            <div class="w-12 h-12 bg-riso-green/30 rounded-xl flex items-center justify-center text-lg">🌿</div>
          </div>
          <div class="absolute" style="left: 55%; top: 55%">
            <div class="w-10 h-10 bg-riso-blue/30 rounded-xl flex items-center justify-center text-lg">🍄</div>
          </div>
          <div class="absolute" style="left: 40%; top: 70%">
            <div class="w-10 h-10 bg-riso-orange/30 rounded-xl flex items-center justify-center text-sm">🪨</div>
          </div>
        </div>

        <!-- 편집 모드 오버레이 -->
        <div v-if="mode === 'edit'" class="absolute inset-0 bg-riso-dark/5 flex items-center justify-center">
          <p class="text-xs text-riso-dark/40 bg-white/80 px-3 py-1 rounded-full">탭하여 아이템 배치</p>
        </div>
      </div>

      <!-- 편집 모드: 아이템 팔레트 -->
      <div v-if="mode === 'edit'" class="bg-white rounded-2xl p-4 border border-gray-100">
        <p class="text-xs text-riso-dark/40 mb-3">보유 아이템 (3개)</p>
        <div class="flex gap-3 overflow-x-auto">
          <div v-for="item in sampleItems" :key="item.name" class="text-center shrink-0">
            <div class="w-14 h-14 bg-riso-cream rounded-xl flex items-center justify-center text-2xl border-2 border-transparent hover:border-riso-green">
              {{ item.icon }}
            </div>
            <p class="text-xs mt-1">{{ item.name }}</p>
            <p class="text-xs text-riso-dark/30">×{{ item.qty }}</p>
          </div>
        </div>
      </div>

      <!-- 감상 모드: 정보 + 공유 -->
      <div v-else class="flex gap-3">
        <div class="flex-1 bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p class="text-xs text-riso-dark/40">아이템</p>
          <p class="font-bold">3개</p>
        </div>
        <div class="flex-1 bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p class="text-xs text-riso-dark/40">배경</p>
          <p class="font-bold text-sm">기본 유리병</p>
        </div>
        <button class="flex-1 bg-riso-pink text-white rounded-xl p-3 font-bold text-sm">
          공유하기
        </button>
      </div>
    </template>

    <!-- ========== Layout B: 분할 화면 (위: 캔버스, 아래: 인벤토리) ========== -->
    <template v-else>
      <!-- 상단: 콤팩트 캔버스 (3:4 비율) -->
      <div class="relative aspect-[3/4] bg-riso-cream rounded-3xl border-2 border-riso-pink/20 overflow-hidden">
        <div class="absolute inset-4 border-2 border-riso-dark/10 rounded-[2rem]">
          <div class="absolute" style="left: 30%; top: 45%">
            <div class="w-10 h-10 bg-riso-green/30 rounded-lg flex items-center justify-center">🌿</div>
          </div>
          <div class="absolute" style="left: 55%; top: 60%">
            <div class="w-8 h-8 bg-riso-blue/30 rounded-lg flex items-center justify-center text-sm">🍄</div>
          </div>
        </div>

        <!-- 상단 바 -->
        <div class="absolute top-3 left-3 right-3 flex justify-between">
          <span class="bg-white/80 px-2 py-1 rounded-lg text-xs">Lv.1 테라리움</span>
          <button class="bg-riso-pink/80 text-white px-3 py-1 rounded-lg text-xs">공유</button>
        </div>
      </div>

      <!-- 하단: 탭형 인벤토리/배경 -->
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="flex border-b border-gray-100">
          <button
            :class="['flex-1 py-3 text-sm font-medium', bottomTab === 'inventory' ? 'text-riso-dark border-b-2 border-riso-green' : 'text-riso-dark/40']"
            @click="bottomTab = 'inventory'"
          >
            아이템 (3)
          </button>
          <button
            :class="['flex-1 py-3 text-sm font-medium', bottomTab === 'background' ? 'text-riso-dark border-b-2 border-riso-green' : 'text-riso-dark/40']"
            @click="bottomTab = 'background'"
          >
            배경 (1/3)
          </button>
        </div>

        <div class="p-4">
          <!-- 인벤토리 -->
          <div v-if="bottomTab === 'inventory'" class="grid grid-cols-4 gap-3">
            <div v-for="item in sampleItems" :key="item.name" class="text-center">
              <div class="aspect-square bg-riso-cream rounded-xl flex items-center justify-center text-2xl border-2 border-transparent active:border-riso-green">
                {{ item.icon }}
              </div>
              <p class="text-xs mt-1 truncate">{{ item.name }}</p>
            </div>
            <div class="aspect-square bg-gray-50 rounded-xl flex items-center justify-center text-riso-dark/20 text-2xl border-2 border-dashed border-gray-200">
              +
            </div>
          </div>

          <!-- 배경 -->
          <div v-else class="grid grid-cols-3 gap-3">
            <div v-for="bg in backgrounds" :key="bg.name" class="text-center">
              <div
                :class="[
                  'aspect-[3/4] rounded-xl flex items-center justify-center text-3xl border-2',
                  bg.active ? 'border-riso-green bg-riso-cream' : 'border-gray-200 bg-gray-50'
                ]"
              >
                {{ bg.icon }}
              </div>
              <p class="text-xs mt-1">{{ bg.name }}</p>
              <p v-if="bg.locked" class="text-xs text-riso-dark/30">Lv.{{ bg.level }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const variant = ref<'A' | 'B'>('A')
const mode = ref<'view' | 'edit'>('view')
const bottomTab = ref<'inventory' | 'background'>('inventory')

const sampleItems = [
  { name: '작은 풀', icon: '🌿', qty: 2 },
  { name: '버섯', icon: '🍄', qty: 1 },
  { name: '돌멩이', icon: '🪨', qty: 3 },
]

const backgrounds = [
  { name: '기본 유리병', icon: '🫧', active: true, locked: false, level: 0 },
  { name: '둥근 어항', icon: '🐠', active: false, locked: true, level: 5 },
  { name: '큰 화분', icon: '🪴', active: false, locked: true, level: 10 },
]
</script>
