<template>
  <div
    v-if="category"
    class="bg-white rounded-[16px] border border-black/10 p-5 space-y-4"
  >
    <div class="flex items-center gap-2">
      <span class="text-2xl">{{ category.emoji ?? '🏷️' }}</span>
      <h3 class="font-bold text-lg text-black">{{ category.name }} 기록</h3>
    </div>

    <div>
      <label for="record-duration" class="block text-sm font-semibold mb-2 text-black">
        시간 (분, 선택사항)
      </label>
      <input
        id="record-duration"
        :value="duration"
        type="number"
        min="1"
        placeholder="예: 30"
        class="w-full h-12 rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-riso-pink"
        @input="$emit('update:duration', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <div>
      <label for="record-note" class="block text-sm font-semibold mb-2 text-black">
        메모 (선택사항)
      </label>
      <textarea
        id="record-note"
        :value="note"
        rows="3"
        placeholder="오늘의 기록을 남겨보세요..."
        class="w-full rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 py-3 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-riso-pink resize-none"
        @input="$emit('update:note', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <button
      type="button"
      class="w-full h-12 rounded-[20px] text-white hover:opacity-90 font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
      style="background-color: #f092f0"
      :disabled="submitting"
      @click="$emit('submit')"
    >
      <Icon name="lucide:sparkles" class="w-4 h-4" />
      <span>{{ submitting ? '기록 중...' : '기록하고 보상 받기' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CategoryResponse } from '@terraworld-it/openapi-frontend'

defineProps<{
  category: CategoryResponse | null
  duration: string
  note: string
  submitting: boolean
}>()

defineEmits<{
  'update:duration': [val: string]
  'update:note': [val: string]
  submit: []
}>()
</script>
