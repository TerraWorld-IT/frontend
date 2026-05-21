<template>
  <div
    v-if="category"
    class="bg-white rounded-[16px] border border-black/10 p-5 space-y-4"
  >
    <div class="flex items-center gap-2">
      <span class="text-2xl">{{ category.emoji ?? '🏷️' }}</span>
      <h3 class="font-bold text-lg text-black">{{ $t('record.categoryRecordTitle', { name: category.name }) }}</h3>
    </div>

    <div>
      <label for="record-duration" class="block text-sm font-semibold mb-2 text-black">
        {{ $t('record.durationLabel') }}
      </label>
      <input
        id="record-duration"
        :value="duration"
        type="number"
        min="1"
        :placeholder="$t('record.durationPlaceholder')"
        class="w-full h-12 rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-riso-pink"
        @input="$emit('update:duration', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <div>
      <label for="record-note" class="block text-sm font-semibold mb-2 text-black">
        {{ $t('record.noteLabel') }}
      </label>
      <textarea
        id="record-note"
        :value="note"
        rows="3"
        :placeholder="$t('record.notePlaceholder')"
        class="w-full rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 py-3 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-riso-pink resize-none"
        @input="$emit('update:note', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <RecordPartnerSelect @change="(value) => $emit('update:partnerUserId', value)" />

    <button
      type="button"
      class="w-full h-12 rounded-[20px] text-white hover:opacity-90 font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
      style="background-color: #f092f0"
      :disabled="submitting"
      @click="$emit('submit')"
    >
      <Icon name="lucide:sparkles" class="w-4 h-4" />
      <span>{{ submitting ? $t('record.submitting') : $t('record.submitAndReward') }}</span>
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
  'update:partnerUserId': [val: string | null]
  submit: []
}>()
</script>
