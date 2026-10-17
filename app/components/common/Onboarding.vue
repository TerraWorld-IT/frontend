<template>
  <Teleport to="body">
    <!--
      z-[9998]: 홈 힐링 모드 스테이지(9990)·홈 팝업(9997) 위의 다이얼로그 밴드에 투어를 표시한다.
      이전 z-[100]에서는 첫 실행 안내가 홈의 병 스테이지 뒤로 깔려 반투명으로만 보였다.
      토스트(9999)·AppUpdateGate(10000)는 투어보다 위에 표시한다.
    -->
    <Transition name="onboarding-fade">
      <div
        v-if="show"
        ref="rootEl"
        data-testid="onboarding-root"
        class="fixed inset-0 z-[9998]"
        :class="spot ? '' : 'bg-black/40 apjek-safe-dialog p-6'"
        role="dialog"
        aria-modal="true"
        :aria-label="t('onboarding.ariaLabel')"
        :aria-labelledby="`${id}-title`"
        :aria-describedby="`${id}-desc`"
      >
        <span
          v-if="spot"
          aria-hidden="true"
          data-testid="onboarding-spot"
          class="fixed rounded-2xl pointer-events-none outline outline-2 outline-apjek-blue"
          :style="spotStyle"
        />
        <div
          ref="cardEl"
          data-testid="onboarding-card"
          :data-placement="spot ? placement : 'center'"
          class="relative z-10 w-full max-w-[393px] bg-apjek-surface text-apjek-text rounded-2xl overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-5 space-y-4"
          :style="cardStyle"
        >
          <p class="text-xs text-apjek-text-faint text-center" aria-live="polite">{{ t('onboarding.progress', { current: step + 1, total: steps.length }) }}</p>
          <h3 :id="`${id}-title`" ref="titleEl" tabindex="-1" class="font-bold text-xl text-apjek-text">{{ t(currentStep.titleKey) }}</h3>
          <p :id="`${id}-desc`" class="text-sm text-apjek-text-sub leading-relaxed">{{ t(currentStep.descKey) }}</p>
          <div class="flex justify-center gap-2" aria-hidden="true">
            <span v-for="(_, idx) in steps" :key="idx" :class="['h-2 rounded-full transition-all', idx === step ? 'bg-apjek-blue w-6' : 'bg-apjek-border-strong w-2']" />
          </div>
          <div class="flex gap-3">
            <button v-if="step > 0" data-testid="onboarding-prev" class="flex-1 h-11 rounded-full border border-apjek-border-strong bg-apjek-surface text-apjek-text-sub text-sm font-medium active:scale-95 transition-transform" @click="step--">{{ t('onboarding.prev') }}</button>
            <button v-if="step < steps.length - 1" data-testid="onboarding-next" class="apjek-cta flex-1 h-11 py-0 text-sm font-semibold active:scale-95 transition-transform" @click="step++">{{ t('onboarding.next') }}</button>
            <button v-else data-testid="onboarding-start" class="apjek-cta flex-1 h-11 py-0 text-sm font-semibold active:scale-95 transition-transform" @click="onComplete">{{ t('onboarding.start') }}</button>
          </div>
          <button v-if="step < steps.length - 1" data-testid="onboarding-skip" class="w-full min-h-11 text-center text-xs text-apjek-text-faint hover:text-apjek-text-sub" @click="onComplete">{{ t('onboarding.skip') }}</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const id = useId()
const rootEl = ref<HTMLElement | null>(null)
const cardEl = ref<HTMLElement | null>(null)
const titleEl = ref<HTMLElement | null>(null)
useDialogFocusTrap(rootEl, computed(() => props.show), onComplete)
const step = ref(0)
const steps = ['nav-record', 'nav-grow', 'nav-shop', 'home-manage', 'home-friends'].map((target, idx) => ({
  target,
  titleKey: `onboarding.step${idx + 1}.title`,
  descKey: `onboarding.step${idx + 1}.desc`,
}))
const currentStep = computed(() => steps[step.value] ?? steps[0]!)
const spot = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const placement = ref<'above' | 'below'>('above')
const cardStyle = ref<CSSProperties>({ maxHeight: 'calc(100dvh - var(--sat) - var(--sab) - 48px)' })
const spotStyle = computed<CSSProperties>(() => spot.value ? {
  left: `${spot.value.left}px`, top: `${spot.value.top}px`,
  width: `${spot.value.width}px`, height: `${spot.value.height}px`,
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
} : {})
let frame: number | null = null
let observer: ResizeObserver | null = null
let observedTarget: HTMLElement | null = null
let disposed = false

function onComplete() {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true')
  emit('close')
}

function measure() {
  if (!props.show || disposed) return
  const target = document.querySelector<HTMLElement>(`[data-tour-target="${currentStep.value.target}"]`)
  if (observedTarget !== target) {
    if (observedTarget) observer?.unobserve(observedTarget)
    observedTarget = target
    if (target) observer?.observe(target)
  }
  const rect = target?.getBoundingClientRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    spot.value = null
    cardStyle.value = { maxHeight: 'calc(100dvh - var(--sat) - var(--sab) - 48px)' }
    return
  }
  spot.value = { left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }
  placement.value = rect.top + rect.height / 2 > window.innerHeight / 2 ? 'above' : 'below'
  // 계산식으로 안전 영역을 유지하여 env()를 담은 CSS 변수도 그대로 해석한다.
  const above = placement.value === 'above'
  const edge = above ? window.innerHeight - rect.top + 18 : rect.bottom + 18
  const available = above
    ? `calc(${rect.top - 30}px - var(--sat, 0px))`
    : `calc(100dvh - ${rect.bottom + 30}px - var(--sab, 0px))`
  // 긴 친구 목록이나 가로 화면에서도 조작할 공간을 확보하고 카드 자체를 스크롤한다.
  const maxHeight = `min(calc(100dvh - var(--sat, 0px) - var(--sab, 0px) - 24px), max(144px, ${available}))`
  const cardHeight = `min(${cardEl.value?.scrollHeight || 320}px, ${maxHeight})`
  cardStyle.value = {
    position: 'fixed',
    width: 'auto',
    left: 'max(24px, calc(var(--sal, 0px) + 12px))',
    right: 'max(24px, calc(var(--sar, 0px) + 12px))',
    marginInline: 'auto',
    top: above ? undefined : `clamp(calc(var(--sat, 0px) + 12px), ${edge}px, calc(100dvh - var(--sab, 0px) - 12px - ${cardHeight}))`,
    bottom: above ? `clamp(calc(var(--sab, 0px) + 12px), ${edge}px, calc(100dvh - var(--sat, 0px) - 12px - ${cardHeight}))` : undefined,
    maxHeight,
  }
}

function scheduleMeasure() {
  if (frame !== null || !props.show || disposed) return
  frame = requestAnimationFrame(() => { frame = null; measure() })
}

async function activateStep() {
  await nextTick()
  if (!props.show || disposed) return
  const target = document.querySelector<HTMLElement>(`[data-tour-target="${currentStep.value.target}"]`)
  if (currentStep.value.target.startsWith('home-')) {
    target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  measure()
  scheduleMeasure()
  titleEl.value?.focus({ preventScroll: true })
  if (cardEl.value) cardEl.value.scrollTop = 0
}

function stopTracking() {
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
  observer?.disconnect()
  observer = null
  observedTarget = null
  window.removeEventListener('scroll', scheduleMeasure, true)
  window.removeEventListener('resize', scheduleMeasure)
}

const { pushBackHandler } = useBackButtonStack()
let unregisterBackHandler: (() => void) | null = null
watch(() => props.show, (open) => {
  if (!import.meta.client) return
  unregisterBackHandler?.()
  unregisterBackHandler = null
  stopTracking()
  if (!open) return
  step.value = 0
  observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure)
  window.addEventListener('scroll', scheduleMeasure, true)
  window.addEventListener('resize', scheduleMeasure)
  unregisterBackHandler = pushBackHandler(() => {
    if (step.value > 0) step.value--
    else onComplete()
  })
  void activateStep()
}, { immediate: true })
watch(step, () => { void activateStep() })
// show=true 로 마운트되면(단독 마운트·Suspense) 첫 활성화 때 카드가 아직 없을 수 있어 마운트 뒤 다시 측정·포커스한다.
onMounted(() => { if (props.show) void activateStep() })
onBeforeUnmount(() => {
  disposed = true
  unregisterBackHandler?.()
  if (import.meta.client) stopTracking()
})
</script>

<style scoped>
.onboarding-fade-enter-active { transition: all 0.3s ease-out; }
.onboarding-fade-leave-active { transition: all 0.2s ease-in; }
.onboarding-fade-enter-from,
.onboarding-fade-leave-to { opacity: 0; }
</style>
