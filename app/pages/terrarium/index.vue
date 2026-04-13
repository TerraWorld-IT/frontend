<template>
  <div class="py-6 space-y-5">
    <!-- Header: Mode Toggle -->
    <div class="flex justify-between items-center">
      <h2 class="font-bold text-riso-dark">My Terrarium</h2>
      <div class="flex gap-1.5 bg-white/70 rounded-full p-0.5 border border-riso-walnut/10">
        <button
          v-for="m in modes"
          :key="m.key"
          :class="[
            'px-3 py-1 rounded-full text-xs font-medium transition-all',
            mode === m.key ? 'bg-riso-navy text-white riso-shadow-sm' : 'text-riso-dark/40',
          ]"
          @click="mode = m.key"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <CommonLoading v-if="terrariumStore.loading.value" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center gap-3 py-12">
      <p class="text-riso-poppy font-medium text-sm">불러오기 실패</p>
      <button class="text-xs bg-riso-sage text-white px-4 py-2 rounded-full" @click="loadData">
        다시 시도
      </button>
    </div>

    <!-- Canvas -->
    <template v-else>
      <TerrariumCanvas
        ref="canvasRef"
        :placed-items="terrariumStore.placedItems.value"
        :editable="mode === 'edit'"
        @slot-click="onSlotClick"
        @heart-click="onHeartClick"
      />

      <!-- Edit mode: inventory + backgrounds -->
      <template v-if="mode === 'edit'">
        <!-- Slot usage info -->
        <div class="flex items-center justify-between">
          <p class="text-xs text-riso-dark/40">
            {{ terrariumStore.placedItems.value.length }} / {{ terrariumStore.maxSlots.value }} 슬롯 사용
          </p>
          <button
            v-if="hasChanges"
            class="text-xs bg-riso-sage text-white px-4 py-2 rounded-full riso-shadow-sm active:scale-95 transition-transform"
            :disabled="saving"
            @click="savePlacements"
          >
            {{ saving ? '저장 중...' : '저장' }}
          </button>
        </div>

        <!-- Owned items (quick preview) -->
        <div class="space-y-2">
          <p class="text-xs text-riso-dark/30 font-medium">보유 아이템</p>
          <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div
              v-for="item in ownedItemDetails"
              :key="item.id"
              class="text-center shrink-0"
            >
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl border border-riso-walnut/10 riso-shadow-sm">
                {{ item.assetUrl }}
              </div>
              <p class="text-[10px] mt-1 text-riso-dark/50 truncate w-14">{{ item.name }}</p>
            </div>
          </div>
        </div>
      </template>

      <!-- View mode: Stats + Share -->
      <template v-else>
        <div class="flex gap-3">
          <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
            <p class="text-xs text-riso-dark/30">아이템</p>
            <p class="font-bold text-lg text-riso-dark">{{ terrariumStore.placedItems.value.length }}</p>
          </div>
          <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
            <p class="text-xs text-riso-dark/30">배경</p>
            <p class="font-bold text-sm text-riso-dark">{{ terrariumStore.data.value?.background?.name ?? '-' }}</p>
          </div>
          <button class="flex-1 bg-riso-pink text-white rounded-2xl p-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
            공유
          </button>
        </div>
      </template>
    </template>

    <!-- Item select dialog -->
    <TerrariumItemSelectDialog
      :show="selectedSlot !== null"
      :slot-id="selectedSlot ?? 0"
      :items="itemsStore.items.value"
      :owned-item-slugs="userStore.me.value?.ownedItems ?? []"
      :placed-items="terrariumStore.placedItems.value"
      :current-item="selectedSlot !== null ? terrariumStore.placedItems.value.find(p => p.slotId === selectedSlot) : undefined"
      @close="selectedSlot = null"
      @select="onItemSelect"
      @remove="onItemRemove"
    />

    <!-- Reward toast -->
    <CommonRewardToast ref="rewardToastRef" :coin="lastReward.coin" :exp="lastReward.exp" />
  </div>
</template>

<script setup lang="ts">
import type { PlacementItem } from '@terraworld-it/openapi-frontend'
import { useTerrariumStore } from '~/stores/terrarium'
import { useItemsStore } from '~/stores/items'
import { useUserStore } from '~/stores/user'

const { sdk, client } = useOpenApi()
const toast = useToast()
const { hapticImpact } = useNative()

const terrariumStore = useTerrariumStore()
const itemsStore = useItemsStore()
const userStore = useUserStore()

const canvasRef = ref<{ addHeartAnimation: () => void } | null>(null)
const rewardToastRef = ref<{ show: () => void } | null>(null)

// Mode
const mode = ref<'view' | 'edit'>('view')
const modes = [
  { key: 'view' as const, label: '감상' },
  { key: 'edit' as const, label: '편집' },
]

// Loading
const fetchError = ref(false)

async function loadData() {
  fetchError.value = false
  try {
    await Promise.all([
      terrariumStore.fetch(),
      itemsStore.fetchAll(),
      userStore.fetchMe(),
    ])
  }
  catch {
    fetchError.value = true
  }
}

onMounted(loadData)

// Item selection
const selectedSlot = ref<number | null>(null)
const pendingChanges = ref<PlacementItem[]>([])
const hasChanges = computed(() => pendingChanges.value.length > 0)
const saving = ref(false)

function onSlotClick(slotId: number) {
  if (mode.value !== 'edit') return
  selectedSlot.value = slotId
}

function onItemSelect(itemId: number) {
  if (selectedSlot.value === null) return

  // Build new placement: replace or add to current slot
  const currentPlacements = terrariumStore.placedItems.value
    .filter(p => p.slotId !== selectedSlot.value)
    .map(p => ({ itemId: p.itemId, slotId: p.slotId! }))

  currentPlacements.push({ itemId, slotId: selectedSlot.value })
  pendingChanges.value = currentPlacements

  selectedSlot.value = null
  void hapticImpact('Medium')
  savePlacements()
}

function onItemRemove(slotId: number) {
  const currentPlacements = terrariumStore.placedItems.value
    .filter(p => p.slotId !== slotId)
    .map(p => ({ itemId: p.itemId, slotId: p.slotId! }))

  pendingChanges.value = currentPlacements
  selectedSlot.value = null
  savePlacements()
}

async function savePlacements() {
  if (pendingChanges.value.length === 0 && terrariumStore.placedItems.value.length === 0) return
  saving.value = true
  try {
    const placements = pendingChanges.value.length > 0
      ? pendingChanges.value
      : terrariumStore.placedItems.value
          .filter(p => p.slotId !== null && p.slotId !== undefined)
          .map(p => ({ itemId: p.itemId, slotId: p.slotId! }))

    await sdk.updateTerrariumPlacements({ client, body: { placedItems: placements } })
    await terrariumStore.fetch()
    pendingChanges.value = []
    toast.success('저장 완료!')
  }
  catch {
    toast.error('저장에 실패했습니다')
  }
  finally {
    saving.value = false
  }
}

// Heart click → earn coins
const lastReward = reactive({ coin: 0, exp: 0 })

async function onHeartClick() {
  try {
    const { data, error } = await sdk.clickTerrariumHeart({ client })
    if (error) throw error

    canvasRef.value?.addHeartAnimation()

    lastReward.coin = 0.1
    lastReward.exp = 0
    rewardToastRef.value?.show()

    // Refresh user wallet after reward
    await userStore.fetchMe()
  }
  catch {
    toast.error('하트 클릭 실패')
  }
}

// Owned item details (for inventory preview)
const ownedItemDetails = computed(() => {
  const slugs = userStore.me.value?.ownedItems ?? []
  return slugs
    .map(slug => itemsStore.items.value.find(i => i.slug === slug))
    .filter(Boolean)
})
</script>
