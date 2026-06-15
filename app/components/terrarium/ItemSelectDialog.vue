<template>
  <CommonModal :model-value="show" @update:model-value="$emit('close')">
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-bold text-riso-dark">{{ $t('terrarium.slotDecorate', { slot: slotId }) }}</h3>
          <p class="text-xs text-riso-dark/40">{{ $t('terrarium.slotSelectHint', { type: slotTypeLabel }) }}</p>
        </div>
        <button
          v-if="currentItem"
          class="text-xs bg-riso-poppy/10 text-riso-poppy px-3 py-1.5 rounded-full border border-riso-poppy/20 active:scale-95 transition-transform"
          @click="$emit('remove', slotId)"
        >
          {{ $t('terrarium.removeItem') }}
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
            {{ item.rarity === 'EPIC' ? $t('shop.epic') : item.rarity === 'RARE' ? $t('shop.rare') : $t('shop.common') }}
          </span>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="compatibleItems.length === 0" class="text-center py-8">
        <p class="text-riso-dark/30 text-sm">{{ $t('terrarium.noOwnedItems', { type: slotTypeLabel }) }}</p>
        <NuxtLink to="/shop" class="text-xs text-riso-blue mt-2 inline-block">
          {{ $t('terrarium.goShop') }}
        </NuxtLink>
      </div>
    </div>
  </CommonModal>
</template>

<script setup lang="ts">
import type { ItemResponse, PlacedItemDetail } from '@terraworld-it/openapi-frontend'

const { t } = useI18n()

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

const SLOT_TYPE_LABEL_KEYS: Record<string, string> = {
  BACKGROUND: 'terrarium.background',
  FOREGROUND: 'terrarium.foreground',
  FIGURE: 'terrarium.figure',
}

const slotType = computed<string>(() => SLOT_TYPE_MAP[props.slotId] ?? 'FOREGROUND')
const slotTypeLabel = computed<string>(() => {
  const key = SLOT_TYPE_LABEL_KEYS[slotType.value]
  return key ? t(key) : ''
})

// Filter: owned + matching layout type
const compatibleItems = computed<ItemResponse[]>(() => {
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
