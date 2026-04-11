<template>
  <CommonModal :model-value="show" @update:model-value="$emit('close')">
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-bold text-riso-dark">슬롯 {{ slotId }} 꾸미기</h3>
          <p class="text-xs text-riso-dark/40">{{ slotTypeLabel }} 아이템을 선택하세요</p>
        </div>
        <button
          v-if="currentItem"
          class="text-xs bg-riso-poppy/10 text-riso-poppy px-3 py-1.5 rounded-full border border-riso-poppy/20 active:scale-95 transition-transform"
          @click="$emit('remove', slotId)"
        >
          제거
        </button>
      </div>

      <!-- Item grid -->
      <div class="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto">
        <button
          v-for="item in compatibleItems"
          :key="item.id"
          :disabled="isPlacedElsewhere(item)"
          :class="[
            'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
            isPlacedElsewhere(item)
              ? 'opacity-40 cursor-not-allowed border-transparent'
              : 'border-transparent hover:border-riso-green/40 active:scale-95 cursor-pointer',
          ]"
          @click="!isPlacedElsewhere(item) && $emit('select', item.id)"
        >
          <div class="w-14 h-14 bg-riso-cream/60 rounded-xl flex items-center justify-center text-3xl">
            {{ item.assetUrl }}
          </div>
          <span class="text-[10px] text-riso-dark/60 truncate w-full text-center">{{ item.name }}</span>
          <span
            :class="[
              'text-[9px] px-1.5 py-0.5 rounded-full',
              item.rarity === 'EPIC' ? 'bg-purple-100 text-purple-600' :
              item.rarity === 'RARE' ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-500'
            ]"
          >
            {{ item.rarity === 'EPIC' ? '에픽' : item.rarity === 'RARE' ? '레어' : '일반' }}
          </span>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="compatibleItems.length === 0" class="text-center py-8">
        <p class="text-riso-dark/30 text-sm">보유한 {{ slotTypeLabel }} 아이템이 없습니다</p>
        <NuxtLink to="/shop" class="text-xs text-riso-blue mt-2 inline-block">
          상점에서 구매하기 →
        </NuxtLink>
      </div>
    </div>
  </CommonModal>
</template>

<script setup lang="ts">
import type { ItemResponse, PlacedItemDetail } from '@terraworld-it/openapi-frontend'

const props = defineProps<{
  show: boolean
  slotId: number
  items: ItemResponse[]
  ownedItemSlugs: string[]
  placedItems: PlacedItemDetail[]
  currentItem?: PlacedItemDetail
}>()

defineEmits<{
  close: []
  select: [itemId: number]
  remove: [slotId: number]
}>()

const SLOT_TYPE_MAP: Record<number, string> = {
  0: 'BACKGROUND',
  1: 'BACKGROUND',
  2: 'FOREGROUND',
  3: 'FIGURE',
  4: 'FOREGROUND',
}

const SLOT_TYPE_LABELS: Record<string, string> = {
  BACKGROUND: '후경',
  FOREGROUND: '전경',
  FIGURE: '피규어',
}

const slotType = computed(() => SLOT_TYPE_MAP[props.slotId] ?? 'FOREGROUND')
const slotTypeLabel = computed(() => SLOT_TYPE_LABELS[slotType.value] ?? '')

// Filter: owned + matching layout type
const compatibleItems = computed(() => {
  return props.items.filter(item =>
    props.ownedItemSlugs.includes(item.slug ?? '') &&
    item.layout === slotType.value,
  )
})

// Check if item is already placed in another slot
function isPlacedElsewhere(item: ItemResponse): boolean {
  return props.placedItems.some(
    p => p.itemId === item.id && p.slotId !== props.slotId,
  )
}
</script>
