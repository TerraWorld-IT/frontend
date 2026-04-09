<template>
  <div class="riso-grain min-h-screen px-4 pt-4 pb-24">
    <!-- Loading -->
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">불러오기 실패</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
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
            class="h-10 w-10 rounded-lg bg-riso-walnut/30 flex items-center justify-center hover:bg-riso-walnut/50 transition-colors"
            aria-label="공유 (준비 중)"
            @click="onShareClick"
          >
            <span class="text-white text-base">↓</span>
          </button>
          <button
            type="button"
            class="h-10 w-10 rounded-lg bg-riso-sage/50 flex items-center justify-center hover:bg-riso-sage/70 transition-colors"
            aria-label="레벨업 (준비 중)"
            @click="onLevelUpClick"
          >
            <span class="text-white text-base">↑</span>
          </button>
          <button
            type="button"
            class="h-10 w-10 rounded-lg bg-riso-lavender/60 flex items-center justify-center hover:bg-riso-lavender/80 transition-colors"
            aria-label="무료 코인 (준비 중)"
            @click="onFreeCoinClick"
          >
            <span class="text-white text-base">🎁</span>
          </button>
        </div>

        <div class="text-right">
          <div class="font-bold text-lg text-riso-dark">{{ terrariumName }}</div>
          <div class="text-sm text-riso-dark/60">Lv {{ user?.progress?.level ?? 1 }}</div>
        </div>
      </div>

      <!-- Jar + slots -->
      <div class="relative flex justify-center my-6">
        <div class="relative w-[280px]">
          <!-- Simplified jar shape (TODO: replace with ported Jamjar SVG) -->
          <div class="absolute inset-0 bg-riso-cream border-2 border-riso-sage/25 rounded-t-[3rem] rounded-b-[1rem] shadow-inner" />
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-3 bg-riso-walnut/40 rounded-full -translate-y-1/2" />

          <!-- Slots inside jar -->
          <div class="relative pt-20 pb-8 px-6">
            <!-- Top row: 2 background slots (slotId 0, 1) -->
            <div class="flex gap-3 justify-center mb-4">
              <button
                v-for="slotId in [0, 1]"
                :key="slotId"
                type="button"
                class="w-20 h-28 rounded-[10px] flex flex-col items-center justify-center transition-all active:scale-95"
                :class="slotItem(slotId) ? 'bg-transparent' : 'border border-riso-walnut/25 bg-white/50 hover:bg-white/70'"
                @click="onSlotClick(slotId)"
              >
                <template v-if="slotItem(slotId)">
                  <div class="text-4xl">{{ slotItem(slotId)!.itemImage }}</div>
                  <div v-if="slotItem(slotId)!.isAnimated" class="text-xs text-riso-butter mt-0.5">
                    ✨
                  </div>
                </template>
                <template v-else>
                  <div class="text-2xl text-riso-walnut/40">+</div>
                  <div class="text-[10px] text-riso-walnut/50 mt-1">후경</div>
                </template>
              </button>
            </div>

            <!-- Bottom row: foreground (2, 4) + figure (3) -->
            <div class="flex gap-3 justify-center">
              <button
                v-for="slotId in [2, 3, 4]"
                :key="slotId"
                type="button"
                class="w-16 h-16 rounded-[10px] flex flex-col items-center justify-center transition-all active:scale-95"
                :class="slotItem(slotId) ? 'bg-transparent' : 'border border-riso-walnut/25 bg-white/50 hover:bg-white/70'"
                @click="onSlotClick(slotId)"
              >
                <template v-if="slotItem(slotId)">
                  <div class="text-3xl">{{ slotItem(slotId)!.itemImage }}</div>
                </template>
                <template v-else>
                  <div class="text-xl text-riso-walnut/40">+</div>
                  <div class="text-[10px] text-riso-walnut/50 mt-0.5">
                    {{ slotId === 3 ? '피규어' : '전경' }}
                  </div>
                </template>
              </button>
            </div>
          </div>
        </div>

        <!-- Heart button -->
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-5xl transition-transform active:scale-90 disabled:opacity-50"
          :disabled="heartBusy"
          aria-label="하트 보상 받기"
          @click="onHeartClick"
        >
          💗
        </button>
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
</template>

<script setup lang="ts">
import type {
  PlacedItemDetail,
  TerrariumResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default' })

const { sdk, client } = useOpenApi()
const toast = useToast()

const pending = ref(true)
const fetchError = ref<Error | null>(null)
const user = ref<UserMeResponse | null>(null)
const terrarium = ref<TerrariumResponse | null>(null)
const heartBusy = ref(false)

const terrariumName = computed(() => {
  const nick = user.value?.nickname
  return nick ? `${nick}의 테라리움` : '나의 테라리움'
})

function slotItem(slotId: number): PlacedItemDetail | undefined {
  return terrarium.value?.placedItems?.find((p) => p.slotId === slotId)
}

function formatCoin(n: number | undefined | null): string {
  if (n === null || n === undefined) return '0'
  // basicCoins/specialCoins are doubles (heart rewards fractional) — show one decimal if fractional
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [meRes, terraRes] = await Promise.all([
      sdk.getMe({ client }),
      sdk.getTerrarium({ client }),
    ])
    if (meRes.error) {
      throw new Error((meRes.error as { message?: string }).message ?? 'getMe failed')
    }
    if (terraRes.error) {
      throw new Error((terraRes.error as { message?: string }).message ?? 'getTerrarium failed')
    }
    user.value = meRes.data ?? null
    terrarium.value = terraRes.data ?? null
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
  try {
    const { data, error } = await sdk.clickTerrariumHeart({ client })
    if (error) {
      throw new Error((error as { message?: string }).message ?? 'heart failed')
    }
    if (data && user.value) {
      user.value.currency.basicCoins = data.updatedBasicCoins
    }
    toast.success(`+${data?.reward ?? 0} 코인`)
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    heartBusy.value = false
  }
}

// TODO(Round N+1): port share (html2canvas), level-up dialog, free-coin (ad reward) dialog
function onShareClick() {
  toast.info('공유 기능 준비 중')
}
function onLevelUpClick() {
  toast.info('레벨업 기능 준비 중')
}
function onFreeCoinClick() {
  toast.info('광고 보상 기능 준비 중')
}

// TODO(Round N+2): open item placement dialog (needs listItems + owned-items filter by slot type)
function onSlotClick(_slotId: number) {
  toast.info('아이템 배치 기능 준비 중')
}

onMounted(load)
</script>
