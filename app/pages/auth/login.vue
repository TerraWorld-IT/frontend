<template>
  <div class="min-h-screen flex flex-col justify-center -mt-14 -mb-20">
    <!-- Layout A/B 토글 -->
    <div class="flex justify-center gap-2 mb-8">
      <button
        v-for="v in ['A', 'B']"
        :key="v"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition',
          variant === v ? 'bg-riso-dark text-white' : 'bg-gray-100 text-gray-500'
        ]"
        @click="variant = v"
      >
        레이아웃 {{ v }}
      </button>
    </div>

    <!-- ========== Layout A: 미니멀 중앙형 ========== -->
    <template v-if="variant === 'A'">
      <div class="text-center mb-10">
        <div class="text-5xl mb-4">🌿</div>
        <h1 class="text-2xl font-bold">TerraWorld</h1>
        <p class="text-sm text-riso-dark/40 mt-2">일상을 기록하고, 나만의 세계를 꾸며요</p>
      </div>

      <div class="space-y-3 max-w-sm mx-auto w-full">
        <input
          type="email"
          placeholder="이메일"
          class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-riso-green"
        />
        <input
          type="password"
          placeholder="비밀번호"
          class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-riso-green"
        />
        <button class="w-full py-3.5 bg-riso-green text-white rounded-xl font-bold text-sm">
          로그인
        </button>
        <p class="text-center text-xs text-riso-dark/40">
          계정이 없으신가요? <button class="text-riso-green font-medium">회원가입</button>
        </p>
      </div>
    </template>

    <!-- ========== Layout B: 일러스트 배경형 ========== -->
    <template v-else>
      <!-- 상단 비주얼 영역 -->
      <div class="bg-gradient-to-b from-riso-green/10 to-riso-cream rounded-b-[3rem] pt-12 pb-16 text-center mb-8 -mx-4">
        <div class="relative w-40 h-40 mx-auto bg-riso-cream rounded-full border-2 border-riso-green/20 flex items-center justify-center">
          <span class="text-6xl">🫧</span>
          <div class="absolute -bottom-2 -right-2 text-2xl">🌿</div>
          <div class="absolute -top-1 -left-1 text-lg">✨</div>
        </div>
        <h1 class="text-2xl font-bold mt-4">TerraWorld</h1>
        <p class="text-sm text-riso-dark/50 mt-1">나만의 작은 세계를 만들어요</p>
      </div>

      <div class="space-y-3">
        <input
          type="email"
          placeholder="이메일 주소"
          class="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-riso-green"
        />
        <input
          type="password"
          placeholder="비밀번호"
          class="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-riso-green"
        />
        <button class="w-full py-3.5 bg-riso-green text-white rounded-2xl font-bold text-sm">
          시작하기
        </button>

        <div class="flex items-center gap-3 my-4">
          <div class="flex-1 h-px bg-gray-200" />
          <span class="text-xs text-riso-dark/30">또는</span>
          <div class="flex-1 h-px bg-gray-200" />
        </div>

        <button class="w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm flex items-center justify-center gap-2">
          <span>G</span> Google로 계속하기
        </button>

        <p class="text-center text-xs text-riso-dark/40 mt-4">
          이미 계정이 있나요? <button class="text-riso-green font-medium">로그인</button>
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
const variant = ref<'A' | 'B'>('A')
</script>
