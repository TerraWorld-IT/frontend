<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-[9997] flex items-center justify-center p-4" @click.self="cancel">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-riso-dark/30 backdrop-blur-sm" />

        <!-- Modal card -->
        <div class="relative bg-riso-cream rounded-2xl p-6 w-full max-w-sm riso-shadow border border-riso-walnut/10">
          <h3 v-if="title" class="text-lg font-bold mb-2">{{ title }}</h3>
          <p v-if="message" class="text-sm text-riso-dark/60 mb-5">{{ message }}</p>
          <slot />

          <div class="flex gap-3 mt-5">
            <button
              v-if="showCancel"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white border border-riso-walnut/15 text-riso-dark/60 active:bg-gray-50"
              @click="cancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-bold text-white riso-shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              :class="confirmClass"
              @click="confirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  variant?: 'primary' | 'danger'
}>(), {
  confirmText: '확인',
  cancelText: '취소',
  showCancel: true,
  variant: 'primary',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const confirmClass = computed(() =>
  props.variant === 'danger' ? 'bg-riso-poppy' : 'bg-riso-sage',
)

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative { transform: scale(0.95); }
</style>
