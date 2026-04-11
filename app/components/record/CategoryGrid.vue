<template>
  <div class="grid grid-cols-2 gap-[12px]">
    <button
      v-for="cat in categories"
      :key="cat.id"
      type="button"
      class="bg-white rounded-[16px] border border-black/10 p-[19px] text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
      :class="modelValue === cat.id ? 'ring-2 ring-riso-pink' : ''"
      @click="$emit('update:modelValue', cat.id)"
    >
      <div class="flex items-center gap-3 mb-[30px]">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          :style="{ backgroundColor: cat.color + '22', color: cat.color }"
        >
          {{ cat.emoji ?? '🏷️' }}
        </div>
        <div>
          <div class="font-bold text-[16px] leading-[24px] text-black tracking-[-0.31px]">
            {{ cat.name }}
          </div>
          <div class="text-[12px] leading-[16px] text-[#737373]">
            +{{ cat.baseTokenReward }} {{ cat.tokenName }}
          </div>
        </div>
      </div>
      <div class="text-[12px] leading-[16px] text-[#525252] flex items-center gap-1">
        <Icon name="lucide:star" class="w-3 h-3" />
        {{ cat.baseCoinReward }} 코인
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CategoryResponse } from '@terraworld-it/openapi-frontend'

defineProps<{
  categories: CategoryResponse[]
  modelValue: number | null
}>()

defineEmits<{
  'update:modelValue': [id: number]
}>()
</script>
