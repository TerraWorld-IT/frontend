<template>
  <!-- login.vue 와 동일한 이유로 h-dvh + 내부 overflow-y-auto 스크롤 영역 분리
       (min-h-screen 은 하한만 있고 상한이 없어, 작은 화면에서 콘텐츠가 뷰포트보다
       길어지면 body 전체가 스크롤되는 오류가 있었다).
       flex-col 이라 justify-center(메인축=세로)가 unsafe alignment 위험 — justify-start +
       각 분기 자식의 my-auto 로 safe centering (Codex 감사 지적, login.vue 와 동일 패턴). -->
  <!-- layout:false 경로라 세이프에어리어를 직접 처리한다 (login.vue 와 동일한 max() 이유).
       딥링크로 바로 진입할 수 있어 네이티브 셸에서 첫 화면이 될 수 있다. -->
  <div
    class="h-dvh w-full bg-riso-cream overflow-y-auto flex flex-col items-center justify-start px-6"
    style="padding-top: max(1.5rem, env(safe-area-inset-top, 0px)); padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px))"
  >
    <!-- Loading -->
    <div v-if="pending" class="text-center space-y-3 my-auto">
      <CommonLoading />
      <p class="text-sm text-riso-dark/40">{{ $t('share.loading') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center space-y-4 my-auto">
      <p class="text-6xl">🫧</p>
      <p class="text-riso-dark font-bold text-lg">{{ $t('share.notFound') }}</p>
      <p class="text-sm text-riso-dark/40">{{ $t('share.notFoundDesc') }}</p>
      <NuxtLink
        to="/"
        class="inline-block bg-riso-sage text-white px-6 py-2.5 rounded-full text-sm font-medium riso-shadow-sm"
      >
        {{ $t('share.startTerraWorld') }}
      </NuxtLink>
    </div>

    <!-- Terrarium Preview -->
    <template v-else>
      <!-- OG-friendly card -->
      <div class="w-full max-w-sm space-y-5 my-auto">
        <!-- User info -->
        <div class="text-center space-y-1">
          <p class="text-sm text-riso-dark/40">{{ $t('share.userTerrarium', { nickname: sharedData?.nickname }) }}</p>
          <h1 class="text-xl font-bold text-riso-dark">{{ $t('share.myTerrariumTitle') }}</h1>
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
            <p class="text-xs text-riso-dark/30">{{ $t('terrarium.items') }}</p>
            <p class="font-bold text-lg text-riso-dark">{{ sharedData?.placedItems?.length ?? 0 }}</p>
          </div>
          <div class="flex-1 bg-white rounded-2xl p-3 border border-riso-walnut/10 text-center riso-shadow-sm">
            <p class="text-xs text-riso-dark/30">{{ $t('terrarium.background') }}</p>
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
            {{ accepting ? $t('share.accepting') : $t('share.acceptInvite') }}
          </button>
          <NuxtLink
            to="/"
            class="block w-full bg-riso-sage text-white rounded-2xl py-3 font-bold text-sm riso-shadow-sm text-center active:scale-95 transition-transform"
          >
            {{ $t('share.startTerraWorldCta') }}
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TerrariumResponse } from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'

definePageMeta({ layout: false })

const route = useRoute()
const { sdk, client } = useOpenApi()
const { isLoggedIn } = useAuth()
const toast = useToast()
const { t } = useI18n()

const code = computed<string>(() => route.params.code as string)

// N16 (구현 계획서 v4, 2026-05-21): 전용 public share API 연동.
// `GET /api/v1/share/{code}` — invite code 의 발신자(초대자) terrarium + nickname 을 반환.
// 인증 불요 — 미가입 사용자도 공유 링크로 발신자 테라리움을 구경 가능.
// 응답 ShareResponse { nickname, terrarium } 를 평탄화해 기존 템플릿 shape 유지.
type ShareData = TerrariumResponse & { nickname?: string }

const { data: sharedData, pending, error } = await useAsyncData(
  `share-${code.value}`,
  async () => {
    const { data, error } = await sdk.getSharedTerrarium({ client, path: { code: code.value } })
    if (error) throw error
    const share = castData<import('@terraworld-it/openapi-frontend').ShareResponse>(data)
    if (!share) return null
    const result: ShareData = {
      ...share.terrarium,
      nickname: share.nickname,
    }
    return result
  },
)

// OG meta tags (SSR)
useHead({
  title: computed<string>(() => `${sharedData.value ? t('share.ogTitle') : 'TerraWorld'} | TerraWorld`),
  meta: [
    { property: 'og:title', content: computed<string>(() => t('share.ogSocialTitle')) },
    { property: 'og:description', content: computed<string>(() => t('share.ogDesc')) },
    { property: 'og:type', content: 'website' },
    { name: 'description', content: computed<string>(() => t('share.ogDesc')) },
  ],
})

// Accept invite
const accepting = ref<boolean>(false)
async function acceptInvite() {
  accepting.value = true
  try {
    const { data, error } = await sdk.acceptInvite({ client, path: { code: code.value } })
    if (error) throw error
    const result = castData<import('@terraworld-it/openapi-frontend').InviteAcceptResponse>(data)
    toast.success(t('share.acceptSuccess', { n: result?.reward?.specialCoins ?? 0 }))
    // 보상이 지급됐으니 프로필 캐시(15초 TTL)를 무효화한다. 그러지 않으면 곧바로 이동하는 홈이
    // 캐시 적중으로 보상 이전 잔액을 그린다. `friends` 의 수락 경로엔 이미 같은 처리가 있다.
    useUserStore().invalidate()
    await navigateTo('/')
  }
  catch {
    toast.error(t('share.acceptFail'))
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
