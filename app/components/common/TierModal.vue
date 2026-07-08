<template>
  <Teleport to="body">
    <Transition name="tier-modal">
      <div v-if="show" ref="rootEl" class="fixed inset-0 z-[9997]" role="dialog" aria-modal="true" aria-label="테라리움 업그레이드">
        <!-- Overlay -->
        <div class="fixed inset-0 bg-black/50" @click="$emit('close')" />

        <!-- Dialog (TERRAWORLD2 레벨업 다이얼로그 Card 스타일) -->
        <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 z-10 w-[90%] max-w-md mx-auto">
          <div class="bg-white rounded-2xl border border-black/10 shadow-2xl p-4">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold flex items-center gap-2 text-emerald-800 text-sm">
                <Icon name="lucide:trending-up" class="w-4 h-4" />
                테라리움 업그레이드
              </h3>
              <button
                type="button"
                class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                @click="$emit('close')"
              >
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3">
              <!-- Intro -->
              <div class="text-center pt-1 pb-2">
                <div class="text-5xl mb-2">🌿</div>
                <h4 class="font-semibold text-base mb-1">테라리움을 넓혀보세요!</h4>
                <p class="text-xs text-gray-500 leading-relaxed">
                  반짝이·루비로 공간을 넓혀<br>더 많은 아이템을 배치할 수 있어요.
                </p>
              </div>

              <!-- 보유 재화 -->
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-[#fdf2fd] rounded-xl p-2.5 text-center">
                  <p class="text-[10px] text-gray-400 mb-0.5">반짝이</p>
                  <p class="font-bold text-[#c026d3] text-sm tabular-nums">{{ Math.floor(balanceOf(currency, 'SPARKLE')) }}</p>
                </div>
                <div class="bg-[#fef2f2] rounded-xl p-2.5 text-center">
                  <p class="text-[10px] text-gray-400 mb-0.5">루비</p>
                  <p class="font-bold text-[#e11d48] text-sm tabular-nums">{{ Math.floor(balanceOf(currency, 'RUBY')) }}</p>
                </div>
              </div>

              <!-- 티어 목록 -->
              <div v-if="catalog" class="space-y-2 max-h-[42dvh] overflow-y-auto">
                <div
                  v-for="tier in catalog.tiers"
                  :key="tier.tier"
                  class="rounded-2xl border p-3.5 flex items-center justify-between transition"
                  :class="tier.tier === catalog.currentTier
                    ? 'border-emerald-300 bg-emerald-50'
                    : tier.unlocked ? 'border-black/10 bg-gray-50 opacity-70' : 'border-black/10 bg-white'"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-800 text-sm tracking-[-0.2px]">{{ tier.nameKo }}</span>
                      <span
                        v-if="tier.tier === catalog.currentTier"
                        class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold"
                      >현재</span>
                    </div>
                    <p class="text-[11px] text-gray-500 mt-0.5">
                      배치 슬롯 {{ tier.slots }}칸<span v-if="tier.spiritCode"> · 정령 지급</span>
                    </p>
                  </div>
                  <!-- 상태: 보유 / 해금버튼(다음) / 잠김 -->
                  <div class="shrink-0">
                    <span v-if="tier.unlocked" class="text-xs text-gray-400 font-semibold">보유</span>
                    <button
                      v-else-if="nextTier && tier.tier === nextTier.tier"
                      type="button"
                      class="h-9 px-3 rounded-xl text-xs font-semibold transition active:scale-95 text-white"
                      :style="canAfford(tier)
                        ? { background: 'linear-gradient(135deg,#7edbc0,#52b388)', boxShadow: '0 2px 8px rgba(82,179,136,0.4)' }
                        : { background: '#f5f5f5', color: '#a1a1a1', boxShadow: 'none' }"
                      :disabled="!canAfford(tier) || busy"
                      @click="onUnlock(tier)"
                    >
                      {{ costLabel(tier) }}
                    </button>
                    <span v-else class="text-xs text-gray-300 font-semibold">🔒 {{ costLabel(tier) }}</span>
                  </div>
                </div>
              </div>
              <div v-else-if="loadError" class="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
                티어 정보를 불러오지 못했어요
                <button type="button" class="mt-2 block mx-auto text-xs font-semibold text-emerald-600 underline" @click="load">다시 시도</button>
              </div>
              <div v-else class="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-400">불러오는 중…</div>

              <button
                type="button"
                class="w-full py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                @click="$emit('close')"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { TierInfo } from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'
import { balanceOf } from '~/utils/currency'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const rootEl = ref<HTMLElement | null>(null)
useDialogFocusTrap(rootEl, computed(() => props.show))

// Android 하드웨어 뒤로가기 — CommonModal 이 아닌 bespoke 오버레이라 직접 back-stack 에 등록.
const { pushBackHandler } = useBackButtonStack()
let unregisterBackHandler: (() => void) | null = null
watch(() => props.show, (open) => {
  if (open) {
    unregisterBackHandler = pushBackHandler(() => emit('close'))
  } else {
    unregisterBackHandler?.()
    unregisterBackHandler = null
  }
})
// 열린 채로 부모(index.vue)가 unmount 되면 watch 의 close 분기가 안 돌아 stale handler 가 남음.
onBeforeUnmount(() => {
  unregisterBackHandler?.()
  unregisterBackHandler = null
})

const { catalog, loadError, nextTier, load, unlock } = useTier()
const userStore = useUserStore()
const toast = useToast()

const currency = computed(() => userStore.currency)
const busy = ref<boolean>(false)

function canAfford(t: TierInfo): boolean {
  return balanceOf(currency.value, 'SPARKLE') >= t.sparkleCost && balanceOf(currency.value, 'RUBY') >= t.rubyCost
}

function costLabel(t: TierInfo): string {
  const parts: string[] = []
  if (t.sparkleCost > 0) parts.push(`반짝이 ${t.sparkleCost}`)
  if (t.rubyCost > 0) parts.push(`루비 ${t.rubyCost}`)
  return parts.length ? parts.join(' + ') : '무료'
}

function unlockErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'INSUFFICIENT_FUNDS':
      return '루비·반짝이가 부족해요'
    case 'INVALID_INPUT':
      return '순서대로만 해금할 수 있어요'
    default:
      return '해금에 실패했어요'
  }
}

async function onUnlock(t: TierInfo): Promise<void> {
  if (!canAfford(t) || busy.value) return
  busy.value = true
  try {
    const result = await unlock(t.tier)
    if (!result.ok) {
      toast.error(unlockErrorMessage(result.error?.code))
      // 실패 시에도 잔액 재동기화(stale 잔액으로 인한 반복 실패 방지 — FP-04)
      await userStore.fetchMe()
      return
    }
    toast.success(`${t.nameKo} 공간을 열었어요! (슬롯 ${result.data.slots}칸)`)
    await userStore.fetchMe() // 재화 차감 + 새 티어 반영
  }
  finally {
    busy.value = false
  }
}

// 모달 열릴 때 카탈로그 로드
watch(() => props.show, (open) => { if (open && !catalog.value) load() }, { immediate: true })
</script>

<style scoped>
.tier-modal-enter-active,
.tier-modal-leave-active {
  transition: opacity 0.2s ease;
}
.tier-modal-enter-from,
.tier-modal-leave-to {
  opacity: 0;
}
</style>
