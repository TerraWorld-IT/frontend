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
    <CommonLoading v-if="terrariumStore.loading" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center gap-3 py-12">
      <p class="text-riso-poppy font-medium text-sm">{{ $t('common.loadFail') }}</p>
      <button class="text-xs bg-riso-sage text-white px-4 py-2 rounded-full" @click="loadData">
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- Canvas -->
    <template v-else>
      <TerrariumCanvas
        ref="canvasRef"
        :placed-items="terrariumStore.placedItems"
        :editable="mode === 'edit'"
        @slot-click="onSlotClick"
        @heart-click="onHeartClick"
      />

      <!-- Edit mode: inventory + backgrounds -->
      <template v-if="mode === 'edit'">
        <!-- Slot usage info -->
        <div class="flex items-center justify-between">
          <p class="text-xs text-riso-dark/40">
            {{ $t('terrarium.slotUsage', { used: terrariumStore.placedItems.length, max: terrariumStore.maxSlots }) }}
          </p>
          <button
            v-if="hasChanges"
            class="text-xs bg-riso-sage text-white px-4 py-2 rounded-full riso-shadow-sm active:scale-95 transition-transform"
            :disabled="saving"
            @click="savePlacements"
          >
            {{ saving ? $t('terrarium.saving') : $t('common.save') }}
          </button>
        </div>

        <!-- Owned items (quick preview) -->
        <div class="space-y-2">
          <p class="text-xs text-riso-dark/30 font-medium">{{ $t('terrarium.available') }}</p>
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
            <p class="text-xs text-riso-dark/30">{{ $t('terrarium.items') }}</p>
            <p class="font-bold text-lg text-riso-dark">{{ terrariumStore.placedItems.length }}</p>
          </div>
          <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
            <p class="text-xs text-riso-dark/30">{{ $t('terrarium.background') }}</p>
            <p class="font-bold text-sm text-riso-dark">{{ terrariumStore.data?.background?.name ?? '-' }}</p>
          </div>
          <button class="flex-1 bg-riso-pink text-white rounded-2xl p-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform">
            {{ $t('common.share') }}
          </button>
        </div>
      </template>
    </template>

    <!-- Item select dialog -->
    <TerrariumItemSelectDialog
      :show="selectedSlot !== null"
      :slot-id="selectedSlot ?? 0"
      :items="[...itemsStore.items]"
      :owned-item-slugs="[...(userStore.me?.ownedItems ?? [])]"
      :placed-items="[...terrariumStore.placedItems]"
      :current-item="selectedSlot !== null ? terrariumStore.placedItems.find(p => p.slotId === selectedSlot) : undefined"
      @close="selectedSlot = null"
      @select="onItemSelect"
      @remove="onItemRemove"
    />

    <!-- Reward toast -->
    <CommonRewardToast ref="rewardToastRef" :coin="lastReward.coin" />
  </div>
</template>

<script setup lang="ts">
import type { HeartResponse, PlacementItem } from '@terraworld-it/openapi-frontend'
import { castData } from '~/composables/useOpenApi'
import { useTerrariumStore } from '~/stores/terrarium'
import { useItemsStore } from '~/stores/items'
import { useUserStore } from '~/stores/user'

// 개인화된 테라리움 데이터를 다루는데 middleware 선언이 아예 없었음 — named middleware(auth.ts)는
// pageMeta 에 명시해야 실행되므로, 이 페이지는 미로그인 상태에서도 미들웨어 단계 리다이렉트 없이
// 그대로 렌더링을 시작하는 gap 이 있었다 (index.vue 와 같은 클래스, Codex 감사로 발견).
definePageMeta({ middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()
const { hapticImpact } = useNative()

const terrariumStore = useTerrariumStore()
const itemsStore = useItemsStore()
const userStore = useUserStore()

const canvasRef = ref<{ addHeartAnimation: () => void } | null>(null)
const rewardToastRef = ref<{ show: () => void } | null>(null)

// Mode
const mode = ref<'view' | 'edit'>('view')
const modes = computed(() => [
  { key: 'view' as const, label: t('terrarium.viewMode') },
  { key: 'edit' as const, label: t('terrarium.editMode') },
])

// Loading
const fetchError = ref<boolean>(false)

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
// TERRA-REMOVE-LAST-NOOP: null = "스테이징된 변경 없음", [] = "전체 제거"(마지막 아이템 제거 포함).
// length 로 판별하면 []("전체 제거")를 "변경 없음"으로 오인해 마지막 아이템 제거가 불가했음.
const pendingChanges = ref<PlacementItem[] | null>(null)
const hasChanges = computed<boolean>(() => pendingChanges.value !== null)
const saving = ref<boolean>(false)

function onSlotClick(slotId: number) {
  if (mode.value !== 'edit') return
  selectedSlot.value = slotId
}

function onItemSelect(itemId: number) {
  if (saving.value) return
  if (selectedSlot.value === null) return

  // Build new placement: replace or add to current slot
  const currentPlacements = terrariumStore.placedItems
    .filter(p => p.slotId !== selectedSlot.value)
    .map(p => ({ itemId: p.itemId, slotId: p.slotId! }))

  currentPlacements.push({ itemId, slotId: selectedSlot.value })
  pendingChanges.value = currentPlacements

  selectedSlot.value = null
  void hapticImpact('Medium')
  savePlacements()
}

function onItemRemove(slotId: number) {
  if (saving.value) return
  const currentPlacements = terrariumStore.placedItems
    .filter(p => p.slotId !== slotId)
    .map(p => ({ itemId: p.itemId, slotId: p.slotId! }))

  pendingChanges.value = currentPlacements
  selectedSlot.value = null
  savePlacements()
}

async function savePlacements() {
  // staged 는 최종 배치 목록 SoT — 빈 배열([]) = 전체 제거. null 이면 스테이징된 변경이 없음.
  // 스토어 재구성으로 덮어쓰지 않는다(그럴 경우 방금 제거한 항목이 되살아남).
  const staged = pendingChanges.value
  if (staged === null) return
  saving.value = true
  try {
    // TERRA-SAVE-FAIL-OPEN: @hey-api client 는 throwOnError 미설정이라 400/409/500 이 throw 아닌 {error} 로
    // resolve 된다. error 무시 시 catch 미발동 → pendingChanges=null(변경 폐기) + 성공 토스트 → silent data loss.
    // 명시 체크로 서버 거부를 catch 로 라우팅하고 pendingChanges 는 보존(재시도 가능).
    const { error } = await sdk.updateTerrariumPlacements({ client, body: { placedItems: staged } })
    if (error) throw error
    await terrariumStore.fetch()
    pendingChanges.value = null
    toast.success(t('terrarium.saveDone'))
  }
  catch {
    toast.error(t('terrarium.saveFail'))
  }
  finally {
    saving.value = false
  }
}

// Heart click → earn coins (낙서장: EXP 개념 제거 — 코인만)
const lastReward = reactive({ coin: 0 })

async function onHeartClick() {
  try {
    const { data, error } = await sdk.clickTerrariumHeart({ client })
    if (error) throw error

    canvasRef.value?.addHeartAnimation()

    // /analyze 2026-05-18 (Codex 3차 F1 fix): hardcoded 0.1 → SDK 응답 동적.
    // backend reward=1 정합 (BIGINT), spec example=1.0. fallback 0 = 응답 부재 시 안전.
    const heart = castData<HeartResponse>(data)
    lastReward.coin = heart?.reward ?? 0
    rewardToastRef.value?.show()

    // Refresh user wallet after reward
    await userStore.fetchMe()
  }
  catch {
    toast.error(t('terrarium.heartFail'))
  }
}

// Owned item details (for inventory preview)
const ownedItemDetails = computed(() => {
  const slugs = userStore.me?.ownedItems ?? []
  return slugs
    .map(slug => itemsStore.items.find(i => i.slug === slug))
    .filter((i): i is NonNullable<typeof i> => i !== undefined && i !== null)
})
</script>
