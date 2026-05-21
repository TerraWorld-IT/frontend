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
                {{ $t('onboarding.prev') }}
              </button>
              <button
                v-if="step < steps.length - 1"
                class="flex-1 h-11 rounded-full bg-riso-sage text-white text-sm font-medium riso-shadow-sm active:scale-95 transition-transform"
                @click="step++"
              >
                {{ $t('onboarding.next') }}
              </button>
              <button
                v-else
                class="flex-1 h-11 rounded-full bg-riso-pink text-white text-sm font-medium riso-shadow-sm active:scale-95 transition-transform"
                @click="onComplete"
              >
                {{ $t('onboarding.start') }}
              </button>
            </div>

            <!-- Skip -->
            <button
              v-if="step < steps.length - 1"
              class="w-full text-center text-xs text-riso-dark/30 hover:text-riso-dark/50"
              @click="onComplete"
            >
              {{ $t('onboarding.skip') }}
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

const { t } = useI18n()
const step = ref(0)

const steps = computed(() => [
  {
    icon: '📝',
    title: t('onboarding.step1.title'),
    desc: t('onboarding.step1.desc'),
    bg: '#FFF8EB',
  },
  {
    icon: '🪙',
    title: t('onboarding.step2.title'),
    desc: t('onboarding.step2.desc'),
    bg: '#F4E4BA44',
  },
  {
    icon: '🛍️',
    title: t('onboarding.step3.title'),
    desc: t('onboarding.step3.desc'),
    bg: '#E8A0BF22',
  },
  {
    icon: '🫧',
    title: t('onboarding.step4.title'),
    desc: t('onboarding.step4.desc'),
    bg: '#7B9E6B22',
  },
  {
    icon: '💌',
    title: t('onboarding.step5.title'),
    desc: t('onboarding.step5.desc'),
    bg: '#A8D8EA33',
  },
])

const currentStep = computed(() => steps.value[step.value] ?? steps.value[0]!)

function onComplete() {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true')
  emit('close')
}
</script>

<style scoped>
.onboarding-fade-enter-active { transition: all 0.3s ease-out; }
.onboarding-fade-leave-active { transition: all 0.2s ease-in; }
.onboarding-fade-enter-from,
.onboarding-fade-leave-to { opacity: 0; }
</style>
