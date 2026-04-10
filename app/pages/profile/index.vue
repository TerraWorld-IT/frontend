<template>
  <div class="riso-grain min-h-screen space-y-[30px] pb-4">
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">불러오기 실패</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
      <button class="mt-2 px-4 py-2 rounded-full bg-riso-sage text-white text-sm" @click="load">
        다시 시도
      </button>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="space-y-1">
        <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">나의 서랍</h2>
        <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
          보유 재화와 아이템을 관리하세요
        </p>
      </div>

      <!-- Currency card -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:coins" class="w-5 h-5" />
            보유 재화
          </h3>
          <NuxtLink to="/shop" class="text-xs font-medium flex items-center gap-1" style="color: #eb662c">
            <Icon name="lucide:arrow-right-left" class="w-4 h-4" />
            환전하러 가기
          </NuxtLink>
        </div>

        <CommonCurrencyDisplay :currency="user?.currency" coin-cell-bg="#fef3ed" />
      </div>

      <!-- Owned items card -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold flex items-center gap-2 text-black">
            <Icon name="lucide:star" class="w-5 h-5" />
            보유 아이템
          </h3>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-[12px] text-center" style="background-color: #fef3ed">
            <div class="text-3xl font-bold text-black mb-1">{{ ownedCount }}</div>
            <div class="text-sm text-[#525252] font-medium">보유 중</div>
          </div>
          <div class="p-4 rounded-[12px] text-center" style="background-color: #fef3ed">
            <div class="text-3xl font-bold text-black mb-1">{{ placedCount }}</div>
            <div class="text-sm text-[#525252] font-medium">배치됨</div>
          </div>
        </div>

        <div class="mt-4 p-3 bg-[#f5f5f5] rounded-[12px] flex items-start gap-3">
          <Icon name="lucide:package" class="w-4 h-4 text-[#525252] mt-0.5 shrink-0" />
          <div class="text-xs text-[#525252]">
            상점에서 구매한 아이템은 테라리움 화면에서 배치할 수 있습니다.
          </div>
        </div>
      </div>

      <!-- Level info -->
      <div v-if="levels.length > 0" class="bg-white rounded-[16px] border border-black/10 p-5">
        <h3 class="font-bold flex items-center gap-2 text-black mb-4">
          <Icon name="lucide:trending-up" class="w-5 h-5" />
          레벨 정보
        </h3>
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="text-4xl font-bold text-black">{{ user?.progress?.level ?? 1 }}</div>
            <div class="text-xs text-[#525252]">현재 레벨</div>
          </div>
          <div class="flex-1">
            <div class="flex justify-between text-xs text-[#525252] mb-1">
              <span>경험치</span>
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

      <!-- Account -->
      <div class="bg-white rounded-[16px] border border-black/10 p-5">
        <h3 class="font-bold mb-4 flex items-center gap-2 text-black">
          <Icon name="lucide:user-circle" class="w-5 h-5" />
          계정
        </h3>

        <div class="space-y-2">
          <button
            type="button"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
            @click="toast.info('이용 안내 페이지 준비 중')"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:info" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">이용 안내</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-4 h-4 text-[#a1a1a1]" />
          </button>

          <NuxtLink
            to="/auth/login"
            class="w-full flex items-center justify-between p-3 bg-white border border-black/10 rounded-[12px] hover:bg-[#f5f5f5] transition-colors"
          >
            <div class="flex items-center gap-3">
              <Icon name="lucide:log-in" class="w-4 h-4 text-[#525252]" />
              <span class="text-sm font-medium text-black">로그인</span>
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
              <span class="text-sm font-medium text-black">{{ loggingOut ? '로그아웃 중...' : '로그아웃' }}</span>
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

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()

const pending = ref(true)
const fetchError = ref<Error | null>(null)
const user = ref<UserMeResponse | null>(null)
const levels = ref<LevelConfigResponse[]>([])
const loggingOut = ref(false)

const ownedCount = computed(() => user.value?.ownedItems?.length ?? 0)
const placedCount = computed(() => user.value?.placedItems?.length ?? 0)

const nextLevelExp = computed(() => {
  const cur = user.value?.progress?.level ?? 1
  const nextLvl = levels.value.find((l) => l.level === cur + 1)
  return nextLvl?.requiredExp ?? 100
})

const expPercent = computed(() => {
  const exp = user.value?.progress?.experience ?? 0
  const target = nextLevelExp.value
  if (target <= 0) return 100
  return Math.min(100, Math.round((exp / target) * 100))
})

function errMsg(e: unknown, fb: string): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return fb
}

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [meRes, lvlRes] = await Promise.all([
      sdk.getMe({ client }),
      sdk.getLevels({ client }),
    ])
    if (meRes.error) throw new Error(errMsg(meRes.error, 'getMe failed'))
    user.value = meRes.data ?? null
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
    const { error } = await sdk.logout({ client })
    if (error) throw new Error(errMsg(error, '로그아웃 실패'))
    toast.success('로그아웃 되었습니다')
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
