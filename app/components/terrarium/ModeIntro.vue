<!--
  모드 진입 인트로 스플래시 (아프젝 T3b 힐링 / T13 관리 — 댓글 #39 진입 가이드).
  풀스크린 연파랑 그라디언트 위에 [이모지 + 제목] / 설명 / 병 일러스트를 1.2초 보여준 뒤 done emit.
  부모는 done 을 받아 실제 모드(healingMode / editMode)를 켠다. 열린 채 unmount 되면 타이머 정리.
  등록명: TerrariumModeIntro.
-->
<template>
  <Teleport to="body">
    <Transition name="mode-intro">
      <div
        v-if="open"
        class="fixed inset-0 z-[9995] flex flex-col items-center justify-center gap-6 px-8"
        style="background: linear-gradient(180deg, #cfe0f6 0%, #eef5ff 55%, #ffffff 100%)"
        role="status"
        aria-live="polite"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-[26px] font-extrabold text-apjek-text tracking-[-0.5px]">
            <span aria-hidden="true">{{ icon }}</span> {{ title }}
          </p>
          <p class="text-sm text-apjek-text-sub leading-relaxed">{{ description }}</p>
        </div>
        <!-- 병 일러스트 — 홈과 같은 Jar1 을 축소 렌더 -->
        <div class="relative w-[220px] h-[304px] mode-intro-jar" aria-hidden="true">
          <IconsJar1 />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  /** 제목 앞 이모지 */
  icon: string
  title: string
  description: string
  /** 표시 시간(ms) — Figma 가이드 1.2초 */
  durationMs?: number
}>(), {
  durationMs: 1200,
})

const emit = defineEmits<{ done: [] }>()

let timer: ReturnType<typeof setTimeout> | null = null

function clear(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

watch(() => props.open, (open) => {
  clear()
  if (!open) return
  timer = setTimeout(() => {
    timer = null
    emit('done')
  }, props.durationMs)
}, { immediate: true })

onBeforeUnmount(clear)
</script>

<style scoped>
.mode-intro-enter-active,
.mode-intro-leave-active { transition: opacity 0.28s ease; }
.mode-intro-enter-from,
.mode-intro-leave-to { opacity: 0; }

@keyframes modeIntroFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.mode-intro-jar { animation: modeIntroFloat 1.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .mode-intro-enter-active,
  .mode-intro-leave-active { transition-duration: 0.01ms; }
  .mode-intro-jar { animation: none; }
}
</style>
