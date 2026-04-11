<template>
  <div class="riso-grain min-h-screen px-4 pt-4 pb-24">
    <!-- Loading -->
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">불러오기 실패</p>
      <p class="text-xs text-riso-dark/60">요청 처리 중 오류가 발생했습니다</p>
      <button
        class="mt-2 px-4 py-2 rounded-full bg-riso-sage text-white text-sm riso-shadow-sm"
        @click="load"
      >
        다시 시도
      </button>
    </div>

    <!-- Main -->
    <template v-else>
      <!-- Header: action buttons + terrarium info -->
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <button
            type="button"
            class="h-10 w-10 rounded-lg bg-[rgba(89,87,87,0.4)] flex items-center justify-center hover:bg-[rgba(89,87,87,0.6)] transition-colors"
            aria-label="테라리움 저장"
            @click="onShareClick"
          >
            <Icon name="lucide:download" class="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            class="h-10 w-10 rounded-lg bg-[rgba(82,179,136,0.4)] flex items-center justify-center hover:bg-[rgba(82,179,136,0.6)] transition-colors"
            aria-label="테라리움 레벨업"
            @click="showLevelUpDialog = true"
          >
            <Icon name="lucide:trending-up" class="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            class="h-10 w-10 rounded-lg bg-[rgba(140,106,228,0.4)] flex items-center justify-center hover:bg-[rgba(140,106,228,0.6)] transition-colors"
            aria-label="무료 코인 받기"
            @click="showFreeCoinDialog = true"
          >
            <Icon name="lucide:gift" class="w-4 h-4 text-white" />
          </button>
        </div>

        <div class="text-right">
          <div class="font-bold text-lg text-riso-dark">{{ terrariumName }}</div>
          <div class="text-sm text-riso-dark/60">Level {{ user?.progress?.level ?? 1 }}</div>
        </div>
      </div>

      <!-- Jar + slots -->
      <div
        id="my-terra-container"
        class="relative flex justify-center w-full overflow-hidden"
        style="padding-top: 1.3rem; padding-bottom: 1.3rem"
      >
        <div class="relative">
          <!-- Jamjar SVG (actual Figma paths) -->
          <IconsJamjarSvg />

          <!-- Slots overlay inside jar -->
          <div class="absolute top-[100px] left-1/2 -translate-x-1/2 w-[220px]">
            <!-- Top row: 2 background slots (slotId 0, 1) -->
            <div class="flex gap-3 justify-center mb-4">
              <button
                v-for="slotId in [0, 1]"
                :key="slotId"
                type="button"
                class="w-20 h-28 rounded-[10px] flex flex-col items-center justify-center transition-all active:scale-95 hover:shadow-md"
                :class="slotItem(slotId) ? 'border-transparent' : 'border border-[#dedede] bg-transparent'"
                @click="onSlotClick(slotId)"
              >
                <template v-if="slotItem(slotId)">
                  <img
                    v-if="isUrl(slotItem(slotId)!.itemImage)"
                    :src="slotItem(slotId)!.itemImage"
                    :alt="slotItem(slotId)!.itemName"
                    class="w-16 h-20 object-contain"
                    :class="slotItem(slotId)!.isAnimated ? 'animate-float' : ''"
                  />
                  <span v-else :class="['text-4xl', slotItem(slotId)!.isAnimated ? 'animate-float' : '']">
                    {{ slotItem(slotId)!.itemImage }}
                  </span>
                  <Icon
                    v-if="slotItem(slotId)!.isAnimated"
                    name="lucide:sparkles"
                    class="w-3 h-3 text-yellow-500 absolute -top-1 -right-1"
                  />
                </template>
                <template v-else>
                  <span class="text-2xl text-[#dedede]">+</span>
                  <span class="text-xs text-[#dedede] mt-1">후경</span>
                </template>
              </button>
            </div>

            <!-- Bottom row: foreground (2, 4) + figure (3) -->
            <div class="flex gap-3 justify-center">
              <button
                v-for="slotId in [2, 3, 4]"
                :key="slotId"
                type="button"
                class="w-16 h-16 rounded-[10px] flex flex-col items-center justify-center transition-all active:scale-95 hover:shadow-md"
                :class="slotItem(slotId) ? 'border-transparent' : 'border border-[#dedede] bg-transparent'"
                @click="onSlotClick(slotId)"
              >
                <template v-if="slotItem(slotId)">
                  <img
                    v-if="isUrl(slotItem(slotId)!.itemImage)"
                    :src="slotItem(slotId)!.itemImage"
                    :alt="slotItem(slotId)!.itemName"
                    class="w-12 h-12 object-contain"
                    :class="slotItem(slotId)!.isAnimated ? 'animate-float' : ''"
                  />
                  <span v-else :class="['text-3xl', slotItem(slotId)!.isAnimated ? 'animate-float' : '']">
                    {{ slotItem(slotId)!.itemImage }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-xl text-[#dedede]">+</span>
                  <span class="text-[10px] text-[#dedede] mt-0.5">
                    {{ slotId === 3 ? '피규어' : '전경' }}
                  </span>
                </template>
              </button>
            </div>
          </div>

          <!-- Heart button + floating rewards -->
          <div class="absolute right-0 top-1/2 -translate-y-1/2">
            <button
              type="button"
              class="relative transition-transform active:scale-90 hover:scale-110 disabled:opacity-50"
              :disabled="heartBusy"
              aria-label="하트 보상 받기"
              @click="onHeartClick"
            >
              <Icon name="lucide:heart" class="w-8 h-8 fill-[#f092f0] text-[#f092f0]" />
              <span
                v-for="f in heartFloats"
                :key="f.id"
                class="heart-float absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none font-bold text-base"
                style="color: #f092f0"
              >
                +0.1
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Currency row -->
      <div class="flex justify-center">
        <div class="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full riso-shadow-sm">
          <span>🪙</span>
          <span class="font-bold text-sm tabular-nums">{{ formatCoin(user?.currency?.basicCoins) }}</span>
          <span class="text-[10px] text-riso-dark/40">기본</span>
          <span class="text-riso-dark/20">|</span>
          <span>💎</span>
          <span class="font-bold text-sm tabular-nums">{{ formatCoin(user?.currency?.specialCoins) }}</span>
          <span class="text-[10px] text-riso-dark/40">스페셜</span>
        </div>
      </div>
    </template>
  </div>

  <!-- ====== Item Placement Dialog ====== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="selectedSlot !== null"
        class="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        @click.self="selectedSlot = null"
      >
        <div class="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md border-2 border-emerald-200">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-emerald-800">
                슬롯 {{ (selectedSlot ?? 0) + 1 }} 꾸미기
              </h3>
              <p class="text-xs text-gray-500 mt-1">
                {{ slotTypeLabel(selectedSlot ?? 0) }} 아이템만 배치 가능
              </p>
            </div>
            <button
              type="button"
              class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              @click="selectedSlot = null"
            >
              <Icon name="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div v-if="placementBusy" class="flex justify-center py-6">
            <CommonLoading variant="spinner" />
          </div>
          <div v-else class="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
            <!-- Remove button (only if slot has item) -->
            <button
              v-if="slotItem(selectedSlot ?? 0)"
              type="button"
              class="aspect-square rounded-lg border-2 border-red-200 bg-red-50 flex flex-col items-center justify-center hover:bg-red-100 transition-colors"
              @click="removeItem"
            >
              <span class="text-2xl mb-1">🗑️</span>
              <span class="text-xs text-red-600 font-medium">제거</span>
            </button>

            <!-- Empty state -->
            <div
              v-if="dialogItems.length === 0 && !slotItem(selectedSlot ?? 0)"
              class="col-span-4 text-center py-8 text-gray-400"
            >
              <div class="text-3xl mb-2">🛒</div>
              <p class="text-sm">보유한 {{ slotTypeLabel(selectedSlot ?? 0) }} 아이템이 없습니다</p>
              <p class="text-xs mt-1">상점에서 구매해보세요!</p>
            </div>

            <!-- Owned compatible items -->
            <button
              v-for="item in dialogItems"
              :key="item.id"
              type="button"
              class="aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all"
              :class="isPlaced(item.id)
                ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300'"
              :disabled="isPlaced(item.id)"
              @click="!isPlaced(item.id) && placeItem(item)"
            >
              <img
                v-if="isUrl(item.assetUrl)"
                :src="item.assetUrl"
                :alt="item.name"
                class="w-10 h-10 object-contain"
              />
              <span v-else class="text-3xl">{{ item.assetUrl }}</span>
              <Icon
                v-if="item.isAnimated"
                name="lucide:sparkles"
                class="w-3 h-3 text-yellow-500 mt-1"
              />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ====== Level-Up Dialog ====== -->
  <CommonModal
    v-model="showLevelUpDialog"
    title="테라리움 레벨업"
    confirm-text="확인"
    :show-cancel="false"
  >
    <div class="text-center py-2">
      <div class="text-5xl mb-3">🌿</div>
      <h4 class="font-semibold text-base mb-2">테라리움을 업그레이드하세요!</h4>
      <p class="text-xs text-gray-600 mb-3">
        재화를 사용하여 테라리움의 크기를 키우고<br />더 많은 아이템을 배치할 수 있습니다.
      </p>
      <div class="bg-emerald-50 rounded-lg p-3 text-left mb-3">
        <p class="text-xs font-semibold text-emerald-800 mb-1">💡 업그레이드 혜택</p>
        <ul class="text-xs text-emerald-700 space-y-0.5">
          <li>• 더 큰 테라리움 공간</li>
          <li>• 추가 슬롯 해금</li>
          <li>• 더 다양한 배치 가능</li>
        </ul>
      </div>
      <p class="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">이 기능은 곧 추가될 예정입니다 🚀</p>
    </div>
  </CommonModal>

  <!-- ====== Free Coin (Ad Reward) Dialog ====== -->
  <CommonModal
    v-model="showFreeCoinDialog"
    title="무료 💎 코인 받기"
    confirm-text="광고 보고 코인 받기"
    :show-cancel="true"
    cancel-text="닫기"
    @confirm="onClaimAdReward"
  >
    <div class="text-center py-2">
      <div class="text-6xl mb-3">📺</div>
      <h4 class="font-semibold text-base mb-2">광고 시청하고 보상 받기</h4>
      <p class="text-sm text-gray-600 mb-3">
        짧은 광고를 시청하면<br />스페셜 코인을 무료로 받을 수 있습니다!
      </p>
      <div class="bg-purple-50 rounded-lg p-3 text-left mb-3">
        <p class="text-sm font-semibold text-purple-800 mb-1">🎁 보상 내역</p>
        <div class="flex items-center justify-between">
          <span class="text-sm text-purple-700">광고 1회 시청</span>
          <span class="font-semibold text-purple-800">💎 +5 스페셜 코인</span>
        </div>
        <p class="text-xs text-purple-600 pt-2 border-t border-purple-200 mt-2">* 하루 최대 3회까지 가능</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 text-left">
        스페셜 코인으로 희귀하고 특별한 아이템을 구매할 수 있습니다!
      </div>
    </div>
  </CommonModal>

  <!-- Onboarding (first visit) -->
  <CommonOnboarding :show="showOnboarding" @close="showOnboarding = false" />
</template>

<script setup lang="ts">
import type {
  AdRewardResponse,
  HeartResponse,
  ItemListResponse,
  ItemResponse,
  PlacedItemDetail,
  TerrariumResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default' })

const { sdk, client } = useOpenApi()
const toast = useToast()

// Onboarding — show on first visit
const showOnboarding = ref(false)
onMounted(() => {
  if (import.meta.client && !localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)) {
    showOnboarding.value = true
  }
})

// --- State ---
const pending = ref(true)
const fetchError = ref<Error | null>(null)
const user = ref<UserMeResponse | null>(null)
const terrarium = ref<TerrariumResponse | null>(null)
const allItems = ref<ItemResponse[]>([])
const heartBusy = ref(false)
const heartFloats = ref<{ id: number }[]>([])
const selectedSlot = ref<number | null>(null)
const placementBusy = ref(false)
const showLevelUpDialog = ref(false)
const showFreeCoinDialog = ref(false)

// --- Computed ---
const terrariumName = computed(() => {
  const nick = user.value?.nickname
  return nick ? `${nick}의 테라리움` : '나의 테라리움'
})

const maxSlots = computed(() => terrarium.value?.maxSlots ?? 5)

const ownedSlugs = computed(() => new Set(user.value?.ownedItems ?? []))

const dialogItems = computed<ItemResponse[]>(() => {
  if (selectedSlot.value === null) return []
  const type = slotLayoutType(selectedSlot.value)
  return allItems.value.filter(
    (item) => item.slug && ownedSlugs.value.has(item.slug) && item.layout === type,
  )
})

// --- Helpers ---
function slotItem(slotId: number): PlacedItemDetail | undefined {
  return terrarium.value?.placedItems?.find((p) => p.slotId === slotId)
}

function slotLayoutType(slotId: number): 'BACKGROUND' | 'FOREGROUND' | 'FIGURE' {
  if (slotId < 2) return 'BACKGROUND'
  if (slotId === 3) return 'FIGURE'
  return 'FOREGROUND'
}

function slotTypeLabel(slotId: number): string {
  const type = slotLayoutType(slotId)
  return type === 'BACKGROUND' ? '후경' : type === 'FIGURE' ? '피규어' : '전경'
}

function isPlaced(itemId: number): boolean {
  if (selectedSlot.value === null) return false
  return (terrarium.value?.placedItems ?? []).some(
    (p) => p.itemId === itemId && p.slotId !== selectedSlot.value,
  )
}

function isUrl(s: string): boolean {
  return s.startsWith('http') || s.startsWith('/')
}

function formatCoin(n: number | undefined | null): string {
  if (n === null || n === undefined) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return fallback
}

// --- API ---
async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [meRes, terraRes, itemsRes] = await Promise.all([
      sdk.getMe({ client }),
      sdk.getTerrarium({ client }),
      sdk.listItems({ client }),
    ])
    if (meRes.error) throw new Error(errMsg(meRes.error, 'getMe failed'))
    if (terraRes.error) throw new Error(errMsg(terraRes.error, 'getTerrarium failed'))
    if (itemsRes.error) throw new Error(errMsg(itemsRes.error, 'listItems failed'))
    user.value = meRes.data as UserMeResponse ?? null
    terrarium.value = terraRes.data as TerrariumResponse ?? null
    allItems.value = (itemsRes.data as ItemListResponse)?.items ?? []
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
  finally {
    pending.value = false
  }
}

async function onHeartClick() {
  if (heartBusy.value) return
  heartBusy.value = true
  const floatId = Date.now()
  heartFloats.value.push({ id: floatId })
  setTimeout(() => {
    heartFloats.value = heartFloats.value.filter((f) => f.id !== floatId)
  }, 700)
  try {
    const { data, error } = await sdk.clickTerrariumHeart({ client })
    if (error) throw new Error(errMsg(error, 'heart failed'))
    const heart = data as HeartResponse
    if (heart && user.value) {
      user.value.currency.basicCoins = heart.updatedBasicCoins
    }
    toast.success(`+${heart?.reward ?? 0} 코인`)
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    heartBusy.value = false
  }
}

function onSlotClick(slotId: number) {
  if (slotId >= maxSlots.value) {
    toast.info('이 슬롯은 잠겨있습니다. 테라리움을 레벨업하세요!')
    return
  }
  selectedSlot.value = slotId
}

async function placeItem(item: ItemResponse) {
  if (selectedSlot.value === null) return
  placementBusy.value = true
  try {
    const existing = (terrarium.value?.placedItems ?? [])
      .filter((p) => p.slotId !== selectedSlot.value)
      .map((p) => ({ itemId: p.itemId, slotId: p.slotId ?? 0 }))
    existing.push({ itemId: item.id, slotId: selectedSlot.value })

    const { error } = await sdk.updateTerrariumPlacements({
      client,
      body: { placedItems: existing },
    })
    if (error) throw new Error(errMsg(error, '배치 실패'))

    const { data: terraData } = await sdk.getTerrarium({ client })
    if (terraData) terrarium.value = terraData as TerrariumResponse
    selectedSlot.value = null
    toast.success('배치 완료!')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    placementBusy.value = false
  }
}

async function removeItem() {
  if (selectedSlot.value === null) return
  placementBusy.value = true
  try {
    const existing = (terrarium.value?.placedItems ?? [])
      .filter((p) => p.slotId !== selectedSlot.value)
      .map((p) => ({ itemId: p.itemId, slotId: p.slotId ?? 0 }))

    const { error } = await sdk.updateTerrariumPlacements({
      client,
      body: { placedItems: existing },
    })
    if (error) throw new Error(errMsg(error, '제거 실패'))

    const { data: terraData } = await sdk.getTerrarium({ client })
    if (terraData) terrarium.value = terraData as TerrariumResponse
    selectedSlot.value = null
    toast.success('아이템 제거 완료')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    placementBusy.value = false
  }
}

async function onClaimAdReward() {
  try {
    const { data, error } = await sdk.claimAdReward({ client })
    if (error) throw new Error(errMsg(error, '광고 보상 실패'))
    const ad = data as AdRewardResponse
    if (ad && user.value) {
      user.value.currency.specialCoins = ad.updatedCurrency.specialCoins
      user.value.currency.basicCoins = ad.updatedCurrency.basicCoins
    }
    toast.success(`+${ad?.reward.specialCoins ?? 0} 스페셜 코인 획득!`)
  }
  catch (e) {
    toast.error((e as Error).message)
  }
}

function onShareClick() {
  toast.info('공유 기능 준비 중')
}

onMounted(load)
</script>

<style scoped>
@keyframes floatUp {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
}

.heart-float {
  animation: floatUp 0.7s ease-out forwards;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
