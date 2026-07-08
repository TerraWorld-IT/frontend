<template>
  <Teleport to="body">
    <Transition name="onboarding-fade">
      <div
        v-if="show"
        ref="rootEl"
        class="fixed inset-0 z-[100] bg-riso-dark/60 flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-label="시작하기 안내"
        @click.self="$emit('close')"
      >
        <div class="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden riso-shadow">
          <!-- Step content — 좌우 스와이프로도 이전/다음 이동(Codex 감사 지적 — 이전엔 버튼 전용) -->
          <div
            class="relative aspect-[4/3] flex items-center justify-center p-8"
            style="touch-action: pan-y"
            :style="{ backgroundColor: currentStep.bg }"
            @pointerdown="onStepPointerDown"
          >
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
                data-testid="onboarding-prev"
                class="flex-1 h-11 rounded-full border border-riso-walnut/15 text-riso-dark/60 text-sm font-medium active:scale-95 transition-transform"
                @click="step--"
              >
                {{ $t('onboarding.prev') }}
              </button>
              <button
                v-if="step < steps.length - 1"
                data-testid="onboarding-next"
                class="flex-1 h-11 rounded-full bg-riso-sage text-white text-sm font-medium riso-shadow-sm active:scale-95 transition-transform"
                @click="step++"
              >
                {{ $t('onboarding.next') }}
              </button>
              <button
                v-else
                data-testid="onboarding-start"
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
const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const rootEl = ref<HTMLElement | null>(null)
useDialogFocusTrap(rootEl, computed(() => props.show))

const { t } = useI18n()
const step = ref<number>(0)

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

// 좌우 스와이프 — 왼쪽으로 스와이프(다음), 오른쪽으로 스와이프(이전). 세로 스크롤/스크롤바운스와
// 안 겹치게 touch-action:pan-y 로 세로 제스처는 브라우저에 양보하고 가로만 여기서 처리.
const SWIPE_THRESHOLD_PX = 40
function onStepPointerDown(e: PointerEvent) {
  const startX = e.clientX
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  function onUp(ev: PointerEvent) {
    const dx = ev.clientX - startX
    if (dx <= -SWIPE_THRESHOLD_PX && step.value < steps.value.length - 1) {
      step.value++
    } else if (dx >= SWIPE_THRESHOLD_PX && step.value > 0) {
      step.value--
    }
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onCancel)
  }
  function onCancel() {
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onCancel)
  }
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)
}

// Android 하드웨어 뒤로가기 — 온보딩 중이면 이전 스텝으로, 첫 스텝이면 닫기(skip 과 동일 취급).
const { pushBackHandler } = useBackButtonStack()
let unregisterBackHandler: (() => void) | null = null
watch(() => props.show, (open) => {
  if (open) {
    unregisterBackHandler = pushBackHandler(() => {
      if (step.value > 0) step.value--
      else onComplete()
    })
  } else {
    unregisterBackHandler?.()
    unregisterBackHandler = null
  }
})
onBeforeUnmount(() => {
  unregisterBackHandler?.()
  unregisterBackHandler = null
})
</script>

<style scoped>
.onboarding-fade-enter-active { transition: all 0.3s ease-out; }
.onboarding-fade-leave-active { transition: all 0.2s ease-in; }
.onboarding-fade-enter-from,
.onboarding-fade-leave-to { opacity: 0; }
</style>
