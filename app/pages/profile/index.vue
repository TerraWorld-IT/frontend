<template>
  <div class="riso-grain min-h-screen space-y-[30px] pb-4">
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">{{ $t('common.loadFail') }}</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
      <button class="mt-2 px-4 py-2 rounded-full bg-riso-sage text-white text-sm" @click="load">
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="space-y-1">
        <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">{{ $t('profile.pageTitle') }}</h2>
        <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
          {{ $t('profile.pageSubtitle') }}
        </p>
      </div>

      <!-- Currency card -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:coins" class="w-5 h-5" />
            {{ $t('profile.currencySection') }}
          </h3>
          <NuxtLink to="/shop" class="text-xs font-medium flex items-center gap-1" style="color: #eb662c">
            <Icon name="lucide:arrow-right-left" class="w-4 h-4" />
            {{ $t('profile.goExchange') }}
          </NuxtLink>
        </div>

        <CommonCurrencyDisplay :currency="user?.currency" coin-cell-bg="#fef3ed" />
      </div>

      <!-- Custom categories -->
      <CommonCustomCategoryManager />

      <!-- Premium theme gallery -->
      <CommonThemeGallery :premium-unlocked="user?.entitlements?.premiumThemes" />

      <!-- Owned items card -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:star" class="w-5 h-5" />
            {{ $t('profile.ownedItems') }}
          </h3>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-[12px] text-center bg-[#fef3ed] dark:bg-[#2e2820]">
            <div class="text-3xl font-bold text-black mb-1">{{ ownedCount }}</div>
            <div class="text-sm text-[#525252] font-medium">{{ $t('profile.owned') }}</div>
          </div>
          <div class="p-4 rounded-[12px] text-center bg-[#fef3ed] dark:bg-[#2e2820]">
            <div class="text-3xl font-bold text-black mb-1">{{ placedCount }}</div>
            <div class="text-sm text-[#525252] font-medium">{{ $t('profile.placed') }}</div>
          </div>
        </div>

        <div class="mt-4 p-3 bg-[#f5f5f5] rounded-[12px] flex items-start gap-3">
          <Icon name="lucide:package" class="w-4 h-4 text-[#525252] mt-0.5 shrink-0" />
          <div class="text-xs text-[#525252]">
            {{ $t('profile.itemsHint') }}
          </div>
        </div>
      </div>

      <!-- Level info -->
      <div v-if="levels.length > 0" class="bg-white rounded-[16px] border border-black/10 p-5">
        <h3 class="font-bold flex items-center gap-2 text-black mb-4">
          <Icon name="lucide:trending-up" class="w-5 h-5" />
          {{ $t('profile.levelSection') }}
        </h3>
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="text-4xl font-bold text-black">{{ user?.progress?.level ?? 1 }}</div>
            <div class="text-xs text-[#525252]">{{ $t('profile.currentLevel') }}</div>
          </div>
          <div class="flex-1">
            <div class="flex justify-between text-xs text-[#525252] mb-1">
              <span>{{ $t('profile.exp') }}</span>
              <span>{{ user?.progress?.experience ?? 0 }} / {{ nextLevelExp }}</span>
            </div>
            <div class="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                style="background-color: #eb662c"
                :style="{ width: `${expPercent}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- P3-2 (PIPA): 동의 항목 관리 — 마케팅/분석/광고 식별자 동의 철회·재동의 -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <h3 class="font-bold mb-1 flex items-center gap-2 text-black">
          <Icon name="lucide:shield-check" class="w-5 h-5" />
          {{ $t('profile.consentSection') }}
        </h3>
        <p class="text-xs text-[#525252] mb-4">{{ $t('profile.consentDesc') }}</p>
        <div class="space-y-2">
          <label
            v-for="item in consentToggles"
            :key="`${item.key}-${consentRenderKey}`"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] cursor-pointer"
          >
            <span class="text-sm font-medium text-black">{{ t(`auth.consent.${item.key}`) }}</span>
            <input
              type="checkbox"
              :checked="item.value"
              :disabled="consentSaving"
              class="w-5 h-5 accent-riso-sage disabled:opacity-50"
              @change="onConsentToggle(item.key, ($event.target as HTMLInputElement).checked)"
            >
          </label>
        </div>
      </div>

      <!-- Account -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <h3 class="font-bold mb-4 flex items-center gap-2 text-black">
          <Icon name="lucide:user-circle" class="w-5 h-5" />
          {{ $t('profile.accountSection') }}
        </h3>

        <div class="space-y-2">
          <NuxtLink
            to="/friends"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:users" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">{{ $t('profile.menuFriends') }}</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-[#a1a1a1]" />
          </NuxtLink>

          <NuxtLink
            to="/ranking"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:trophy" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">{{ $t('profile.menuRanking') }}</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-[#a1a1a1]" />
          </NuxtLink>

          <button
            type="button"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
            @click="toast.info(t('profile.menuGuideComingSoon'))"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:info" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">{{ $t('profile.menuGuide') }}</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-[#a1a1a1]" />
          </button>

          <NuxtLink
            to="/auth/login"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:log-in" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">{{ $t('auth.login') }}</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-[#a1a1a1]" />
          </NuxtLink>

          <button
            type="button"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
            :disabled="loggingOut"
            @click="onLogout"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:log-out" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">{{ loggingOut ? $t('profile.loggingOut') : $t('profile.logout') }}</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-[#a1a1a1]" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  LevelConfigResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()

const pending = ref<boolean>(true)
const fetchError = ref<Error | null>(null)
const user = ref<UserMeResponse | null>(null)
const levels = ref<LevelConfigResponse[]>([])
const loggingOut = ref<boolean>(false)

// P3-2 (PIPA): 동의 항목 관리 — better-auth session 의 동의 필드를 읽어 토글, 변경 시 updateUser.
const session = authClient.useSession()
const consentSaving = ref<boolean>(false)
// H1 (code-review): 저장 시도마다 증가시켜 체크박스를 re-mount → 실패 시 DOM 의 토글된 상태를
// persisted item.value 로 되돌린다(uncontrolled :checked 가 실패 후 갱신 안 되는 divergence 차단).
const consentRenderKey = ref<number>(0)
// code-review: 철회 토글은 마케팅/분석/광고식별자 3종만. 사진(photo)·푸시(push)는 앱 내 토글이
// 아니라 단말 OS 권한(카메라/알림)으로 관리·철회되므로 본 화면에서 의도적으로 제외(가입 시점엔
// 분리 동의로 기록하되, 철회는 OS 설정 경로).
const consentToggles = ref<Array<{ key: string; field: string; value: boolean }>>([
  { key: 'marketing', field: 'marketingConsent', value: false },
  { key: 'analytics', field: 'analyticsConsent', value: false },
  { key: 'adId', field: 'adConsent', value: false },
])

watch(
  () => session.value?.data?.user,
  (u) => {
    const cu = u as { marketingConsent?: boolean; analyticsConsent?: boolean; adConsent?: boolean } | undefined
    if (!cu) return
    consentToggles.value = [
      { key: 'marketing', field: 'marketingConsent', value: cu.marketingConsent ?? false },
      { key: 'analytics', field: 'analyticsConsent', value: cu.analyticsConsent ?? false },
      { key: 'adId', field: 'adConsent', value: cu.adConsent ?? false },
    ]
  },
  { immediate: true },
)

async function onConsentToggle(key: string, checked: boolean) {
  const item = consentToggles.value.find((c) => c.key === key)
  if (!item || consentSaving.value) return
  consentSaving.value = true
  try {
    const { error } = await authClient.updateUser(
      { [item.field]: checked } as unknown as Parameters<typeof authClient.updateUser>[0],
    )
    if (error) throw new Error(error.message ?? t('profile.consentSaveFail'))
    item.value = checked
    toast.success(t('profile.consentSaved'))
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    consentSaving.value = false
    consentRenderKey.value++ // 성공·실패 모두 checkbox re-mount → :checked 가 item.value 와 동기
  }
}

const ownedCount = computed<number>(() => user.value?.ownedItems?.length ?? 0)
const placedCount = computed<number>(() => user.value?.placedItems?.length ?? 0)

const nextLevelExp = computed<number>(() => {
  const cur = user.value?.progress?.level ?? 1
  const nextLvl = levels.value.find((l) => l.level === cur + 1)
  return nextLvl?.requiredExp ?? 100
})

const expPercent = computed<number>(() => {
  const exp = user.value?.progress?.experience ?? 0
  const target = nextLevelExp.value
  if (target <= 0) return 100
  return Math.min(100, Math.round((exp / target) * 100))
})

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [meRes, lvlRes] = await Promise.all([
      sdk.getMe({ client }),
      sdk.getLevels({ client }),
    ])
    if (meRes.error) throw new Error(errMsg(meRes.error, 'getMe failed'))
    user.value = castData<import('@terraworld-it/openapi-frontend').UserMeResponse>(meRes.data) ?? null
    // getLevels might fail (not critical)
    if (!lvlRes.error && lvlRes.data) {
      const raw = lvlRes.data as unknown
      levels.value = Array.isArray(raw) ? raw : (raw as { levels?: LevelConfigResponse[] }).levels ?? []
    }
  }
 catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
 finally {
    pending.value = false
  }
}

async function onLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    const { signOutAndClear } = useAuth()
    await signOutAndClear()
    toast.success(t('profile.loggedOut'))
    await navigateTo('/auth/login')
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    loggingOut.value = false
  }
}

onMounted(load)
</script>
