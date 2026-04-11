<template>
  <div class="min-h-screen bg-riso-cream flex flex-col items-center justify-center p-6">
    <!-- Loading -->
    <div v-if="pending" class="text-center space-y-3">
      <CommonLoading />
      <p class="text-sm text-riso-dark/40">테라리움을 불러오는 중...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center space-y-4">
      <p class="text-6xl">🫧</p>
      <p class="text-riso-dark font-bold text-lg">테라리움을 찾을 수 없어요</p>
      <p class="text-sm text-riso-dark/40">초대 코드가 만료되었거나 잘못되었을 수 있어요</p>
      <NuxtLink
        to="/"
        class="inline-block bg-riso-sage text-white px-6 py-2.5 rounded-full text-sm font-medium riso-shadow-sm"
      >
        TerraWorld 시작하기
      </NuxtLink>
    </div>

    <!-- Terrarium Preview -->
    <template v-else>
      <!-- OG-friendly card -->
      <div class="w-full max-w-sm space-y-5">
        <!-- User info -->
        <div class="text-center space-y-1">
          <p class="text-sm text-riso-dark/40">{{ sharedData?.nickname }}님의 테라리움</p>
          <h1 class="text-xl font-bold text-riso-dark">My Terrarium</h1>
        </div>

        <!-- Jar preview (read-only) -->
        <div class="relative aspect-square bg-gradient-to-b from-riso-cream via-white to-riso-cream/60 rounded-[2.5rem] border-2 border-riso-walnut/10 overflow-hidden riso-shadow mx-auto">
          <div class="absolute inset-3 rounded-[2rem] border-2 border-riso-walnut/8">
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2/5 h-5 bg-riso-cream/80 rounded-t-xl border-2 border-b-0 border-riso-walnut/8" />
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-[45%] h-3 bg-riso-walnut/15 rounded-t-lg" />
          </div>

          <div class="absolute bottom-3 left-3 right-3 h-1/5 bg-gradient-to-t from-riso-walnut/20 to-riso-walnut/5 rounded-b-[1.8rem]" />

          <!-- Placed items -->
          <div
            v-for="(item, idx) in sharedData?.placedItems ?? []"
            :key="idx"
            class="absolute transition-all duration-300"
            :style="slotPosition(item.slotId ?? 0)"
          >
            <div :class="['flex items-center justify-center text-3xl', item.isAnimated ? 'animate-sway' : '']">
              {{ item.itemImage }}
            </div>
          </div>

          <div class="absolute top-6 left-6 w-8 h-20 bg-white/30 rounded-full rotate-12 blur-sm" />
        </div>

        <!-- Stats -->
        <div class="flex gap-3">
          <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
            <p class="text-xs text-riso-dark/30">아이템</p>
            <p class="font-bold text-lg text-riso-dark">{{ sharedData?.placedItems?.length ?? 0 }}</p>
          </div>
          <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
            <p class="text-xs text-riso-dark/30">배경</p>
            <p class="font-bold text-sm text-riso-dark">{{ sharedData?.background?.name ?? '-' }}</p>
          </div>
        </div>

        <!-- CTA -->
        <div class="space-y-3">
          <button
            v-if="isLoggedIn"
            class="w-full bg-riso-pink text-white rounded-2xl py-3 font-bold text-sm riso-shadow-sm active:scale-95 transition-transform"
            :disabled="accepting"
            @click="acceptInvite"
          >
            {{ accepting ? '수락 중...' : '초대 수락하기' }}
          </button>
          <NuxtLink
            to="/"
            class="block w-full bg-riso-sage text-white rounded-2xl py-3 font-bold text-sm riso-shadow-sm text-center active:scale-95 transition-transform"
          >
            나도 TerraWorld 시작하기
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { sdk, client } = useOpenApi()
const { isLoggedIn } = useAuth()
const toast = useToast()

const code = computed(() => route.params.code as string)

// SSR-friendly data fetch
const { data: sharedData, pending, error } = await useAsyncData(
  `share-${code.value}`,
  async () => {
    const { data, error } = await sdk.getTerrarium({ client })
    if (error) throw error
    return data
  },
)

// OG meta tags (SSR)
useHead({
  title: `${sharedData.value ? '테라리움 구경하기' : 'TerraWorld'} | TerraWorld`,
  meta: [
    { property: 'og:title', content: '친구의 테라리움을 구경해보세요!' },
    { property: 'og:description', content: '일상을 기록하고, 나만의 테라리움을 꾸며보세요' },
    { property: 'og:type', content: 'website' },
    { name: 'description', content: '일상을 기록하고, 나만의 테라리움을 꾸며보세요' },
  ],
})

// Accept invite
const accepting = ref(false)
async function acceptInvite() {
  accepting.value = true
  try {
    const { data, error } = await sdk.acceptInvite({ client, path: { code: code.value } })
    if (error) throw error
    const result = data as import('@terraworld-it/openapi-frontend').InviteAcceptResponse | undefined
    toast.success(`초대 수락 완료! 스페셜 코인 +${result?.reward?.specialCoins ?? 0}`)
    await navigateTo('/')
  }
  catch {
    toast.error('초대 수락에 실패했습니다')
  }
  finally {
    accepting.value = false
  }
}

// Slot position mapping for share preview
const SLOT_POSITIONS: Record<number, { top: string; left: string }> = {
  0: { top: '26%', left: '35%' },
  1: { top: '26%', left: '55%' },
  2: { top: '52%', left: '25%' },
  3: { top: '52%', left: '45%' },
  4: { top: '52%', left: '65%' },
}

const DEFAULT_SLOT_POS = { top: '26%', left: '35%' }

function slotPosition(slotId: number): { top: string; left: string } {
  return SLOT_POSITIONS[slotId] ?? DEFAULT_SLOT_POS
}
</script>
