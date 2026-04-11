<template>
  <Teleport to="body">
    <Transition name="onboarding-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[100] bg-riso-dark/60 flex items-center justify-center p-6"
        @click.self="$emit('close')"
      >
        <div class="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden riso-shadow">
          <!-- Step content -->
          <div class="relative aspect-[4/3] flex items-center justify-center p-8" :style="{ backgroundColor: currentStep.bg }">
            <div class="text-center space-y-3">
              <span class="text-6xl block">{{ currentStep.icon }}</span>
              <h3 class="font-bold text-xl text-riso-dark">{{ currentStep.title }}</h3>
              <p class="text-sm text-riso-dark/60 leading-relaxed">{{ currentStep.desc }}</p>
            </div>
          </div>

          <!-- Navigation -->
          <div class="p-5 space-y-4">
            <!-- Progress dots -->
            <div class="flex justify-center gap-2">
              <div
                v-for="(_, idx) in steps"
                :key="idx"
                :class="[
                  'w-2 h-2 rounded-full transition-all',
                  idx === step ? 'bg-riso-sage w-6' : 'bg-riso-dark/15',
                ]"
              />
            </div>

            <!-- Buttons -->
            <div class="flex gap-3">
              <button
                v-if="step > 0"
                class="flex-1 h-11 rounded-full border border-riso-walnut/15 text-riso-dark/60 text-sm font-medium active:scale-95 transition-transform"
                @click="step--"
              >
                이전
              </button>
              <button
                v-if="step < steps.length - 1"
                class="flex-1 h-11 rounded-full bg-riso-sage text-white text-sm font-medium riso-shadow-sm active:scale-95 transition-transform"
                @click="step++"
              >
                다음
              </button>
              <button
                v-else
                class="flex-1 h-11 rounded-full bg-riso-pink text-white text-sm font-medium riso-shadow-sm active:scale-95 transition-transform"
                @click="onComplete"
              >
                시작하기!
              </button>
            </div>

            <!-- Skip -->
            <button
              v-if="step < steps.length - 1"
              class="w-full text-center text-xs text-riso-dark/30 hover:text-riso-dark/50"
              @click="onComplete"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const step = ref(0)

const steps = [
  {
    icon: '📝',
    title: '활동 기록하기',
    desc: '산책, 독서, 러닝, 낙서 — 일상의 활동을 기록하면 코인과 토큰을 받아요',
    bg: '#FFF8EB',
  },
  {
    icon: '🪙',
    title: '보상 모으기',
    desc: '기록할 때마다 코인과 카테고리 토큰을 획득! 레벨업도 함께 올라가요',
    bg: '#F4E4BA44',
  },
  {
    icon: '🛍️',
    title: '아이템 구매하기',
    desc: '모은 코인과 토큰으로 상점에서 귀여운 아이템을 구매할 수 있어요',
    bg: '#E8A0BF22',
  },
  {
    icon: '🫧',
    title: '테라리움 꾸미기',
    desc: '구매한 아이템을 유리병 안에 배치하여 나만의 테라리움을 완성하세요',
    bg: '#7B9E6B22',
  },
  {
    icon: '💌',
    title: '친구에게 공유',
    desc: '완성된 테라리움을 친구에게 공유하고, 함께 기록하며 더 큰 보상을 받아요!',
    bg: '#A8D8EA33',
  },
]

const currentStep = computed(() => steps[step.value])

function onComplete() {
  localStorage.setItem('tw-onboarding-done', 'true')
  emit('close')
}
</script>

<style scoped>
.onboarding-fade-enter-active { transition: all 0.3s ease-out; }
.onboarding-fade-leave-active { transition: all 0.2s ease-in; }
.onboarding-fade-enter-from,
.onboarding-fade-leave-to { opacity: 0; }
</style>
