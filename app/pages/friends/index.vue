<template>
  <div class="riso-grain min-h-screen px-4 py-4 space-y-6">
    <!-- 헤더 -->
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
        {{ $t('friends.title') }}
      </h2>
      <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
        {{ $t('friends.subtitle') }}
      </p>
    </div>

    <!-- Section 1: 내 초대 코드 -->
    <section class="bg-white rounded-2xl p-4 riso-shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-[15px] text-riso-dark">
          {{ $t('friends.myCode') }}
        </h3>
        <span class="text-[11px] text-riso-dark/50">{{ $t('friends.expiresDays') }}</span>
      </div>

      <div v-if="myCode" class="space-y-3">
        <div class="bg-riso-cream rounded-xl px-4 py-3 flex items-center justify-between">
          <code class="font-mono font-bold text-[20px] tracking-[3px] text-riso-dark">
            {{ myCode }}
          </code>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-full bg-white text-[12px] font-semibold text-riso-dark riso-shadow-sm active:scale-95"
              @click="copyMyCode"
            >
              {{ $t('friends.copy') }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-full bg-riso-pink text-white text-[12px] font-semibold riso-shadow-sm active:scale-95"
              @click="shareMyCode"
            >
              {{ $t('common.share') }}
            </button>
          </div>
        </div>
        <p class="text-[12px] text-riso-dark/55 leading-[18px]">
          {{ $t('friends.codeHint') }}
        </p>
      </div>

      <button
        v-else
        type="button"
        class="w-full h-12 rounded-xl bg-riso-sage text-white font-semibold text-[14px] riso-shadow-sm active:scale-95 disabled:opacity-50"
        :disabled="creating"
        @click="onCreateInvite"
      >
        {{ creating ? $t('friends.creating') : $t('friends.createCode') }}
      </button>
    </section>

    <!-- Section 2: 친구 코드 입력 -->
    <section class="bg-white rounded-2xl p-4 riso-shadow-sm space-y-3">
      <h3 class="font-semibold text-[15px] text-riso-dark">
        {{ $t('friends.enterCode') }}
      </h3>
      <p class="text-[12px] text-riso-dark/55 leading-[18px]">
        {{ $t('friends.enterCodeHint') }}
      </p>
      <input
        v-model="inputCode"
        type="text"
        maxlength="8"
        placeholder="ABCD1234"
        class="w-full h-12 px-4 rounded-xl bg-riso-cream font-mono tracking-[3px] text-center uppercase text-[18px] focus:outline-none focus:ring-2 focus:ring-riso-pink"
        @input="onCodeInput"
      >
      <button
        type="button"
        class="w-full h-12 rounded-xl bg-riso-pink text-white font-semibold text-[14px] riso-shadow-sm active:scale-95 disabled:opacity-50"
        :disabled="accepting || inputCode.length !== 8"
        @click="onAcceptInvite"
      >
        {{ accepting ? $t('friends.accepting') : $t('friends.acceptCode') }}
      </button>
    </section>

    <!-- Section 3: 내 친구 목록 -->
    <section class="bg-white rounded-2xl p-4 riso-shadow-sm space-y-3">
      <h3 class="font-semibold text-[15px] text-riso-dark">
        {{ $t('friends.listTitle') }}
      </h3>

      <!-- 로딩 -->
      <div v-if="friendsLoading" class="py-6 flex justify-center">
        <CommonLoading />
      </div>

      <!-- 빈 상태 -->
      <p
        v-else-if="friends.length === 0"
        class="text-[13px] text-riso-dark/55 leading-[18px] py-4 text-center"
      >
        {{ $t('friends.noFriends') }}
      </p>

      <!-- 친구 카드 목록 -->
      <ul v-else class="space-y-2.5">
        <li
          v-for="friend in friends"
          :key="friend.userId"
          class="bg-riso-cream rounded-xl px-3.5 py-3 flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="font-semibold text-[14px] text-riso-dark truncate">
              {{ friend.nickname }}
            </p>
            <p class="text-[12px] text-riso-dark/55">
              {{ $t('friends.likeCount', { n: friend.likeCount }) }}
            </p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-full bg-white text-[12px] font-semibold text-riso-dark riso-shadow-sm active:scale-95 disabled:opacity-50"
              :disabled="visitingId === friend.userId"
              @click="onVisit(friend)"
            >
              {{ $t('friends.visit') }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-full text-[12px] font-semibold riso-shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1"
              :class="friend.liked ? 'bg-riso-pink text-white' : 'bg-white text-riso-dark'"
              :disabled="likingId === friend.userId"
              :aria-pressed="friend.liked ? 'true' : 'false'"
              @click="onToggleLike(friend)"
            >
              <span aria-hidden="true">{{ friend.liked ? '♥' : '♡' }}</span>
              {{ $t('friends.likeButton') }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 놀러가기 모달 -->
    <CommonModal
      v-model="visitModalOpen"
      :title="visitFriend ? $t('friends.visitTitle', { nickname: visitFriend.nickname }) : ''"
      :show-cancel="false"
      :confirm-text="$t('common.close')"
    >
      <div v-if="visitTerrarium" class="space-y-4">
        <!-- Jar preview (read-only) -->
        <div class="relative aspect-square bg-gradient-to-b from-riso-cream via-white to-riso-cream/60 rounded-[2rem] border-2 border-riso-walnut/10 overflow-hidden riso-shadow-sm mx-auto">
          <div class="absolute inset-3 rounded-[1.6rem] border-2 border-riso-walnut/8">
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2/5 h-4 bg-riso-cream/80 rounded-t-xl border-2 border-b-0 border-riso-walnut/8" />
          </div>
          <div class="absolute bottom-3 left-3 right-3 h-1/5 bg-gradient-to-t from-riso-walnut/20 to-riso-walnut/5 rounded-b-[1.4rem]" />
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-5xl" aria-hidden="true">🪴</span>
          </div>
        </div>
        <p class="text-[13px] text-riso-dark/65 text-center">
          {{ $t('friends.visitItemCount', { n: visitTerrarium.placedItems?.length ?? 0 }) }}
        </p>
      </div>
      <div v-else class="py-6 flex flex-col items-center gap-2">
        <CommonLoading />
        <p class="text-[12px] text-riso-dark/45">{{ $t('friends.visitLoading') }}</p>
      </div>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
import type { InviteAcceptResponse, InviteResponse, TerrariumResponse } from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { sdk, client } = useOpenApi()
const { request } = useInternalApi()
const toast = useToast()
const { share: nativeShare } = useNative()
const userStore = useUserStore()
const { trackInviteCreated, trackInviteAccepted } = useGtagEvents()

const myCode = ref<string>('')
const myExpiresAt = ref<string>('')
const inputCode = ref<string>('')
const creating = ref(false)
const accepting = ref(false)

// --- 친구 목록 (P-FRIEND, @Hidden endpoint → useInternalApi) ---
interface FriendItem {
  userId: string
  nickname: string
  likeCount: number
  liked?: boolean
}

const friends = ref<FriendItem[]>([])
const friendsLoading = ref(false)
const likingId = ref<string | null>(null)
const visitingId = ref<string | null>(null)
const visitModalOpen = ref(false)
const visitFriend = ref<FriendItem | null>(null)
const visitTerrarium = ref<TerrariumResponse | null>(null)

async function loadFriends() {
  friendsLoading.value = true
  try {
    const list = await request<FriendItem[]>('/api/v1/social/friends')
    friends.value = (list ?? []).map(f => ({ ...f, liked: f.liked ?? false }))
  }
  catch {
    toast.error(t('friends.listLoadError'))
  }
  finally {
    friendsLoading.value = false
  }
}

async function onToggleLike(friend: FriendItem) {
  if (likingId.value) return
  likingId.value = friend.userId
  try {
    const result = await request<{ liked: boolean, likeCount: number }>(
      `/api/v1/social/friends/${friend.userId}/like`,
      { method: 'POST' },
    )
    friend.liked = result.liked
    friend.likeCount = result.likeCount
  }
  catch {
    toast.error(t('friends.likeError'))
  }
  finally {
    likingId.value = null
  }
}

async function onVisit(friend: FriendItem) {
  if (visitingId.value) return
  visitingId.value = friend.userId
  visitFriend.value = friend
  visitTerrarium.value = null
  visitModalOpen.value = true
  try {
    const terrarium = await request<TerrariumResponse>(
      `/api/v1/social/friends/${friend.userId}/terrarium`,
    )
    visitTerrarium.value = terrarium
  }
  catch {
    visitModalOpen.value = false
    toast.error(t('friends.visitError'))
  }
  finally {
    visitingId.value = null
  }
}

onMounted(loadFriends)

async function onCreateInvite() {
  if (creating.value) return
  creating.value = true
  try {
    const { data, error } = await sdk.createInvite({ client })
    if (error) throw new Error(errMsg(error, t('friends.createError')))
    const invite = castData<InviteResponse>(data)
    if (invite) {
      myCode.value = (invite as { inviteCode?: string }).inviteCode ?? ''
      myExpiresAt.value = (invite as { expiresAt?: string }).expiresAt ?? ''
      trackInviteCreated()
    }
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    creating.value = false
  }
}

async function copyMyCode() {
  if (!myCode.value || !import.meta.client) return
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(myCode.value)
    toast.success(t('friends.codeCopied'))
  }
  else {
    toast.info(t('friends.codeIs', { code: myCode.value }))
  }
}

async function shareMyCode() {
  if (!myCode.value || !import.meta.client) return
  const link = `${window.location.origin}/share/${myCode.value}`
  await nativeShare({
    title: t('friends.shareTitle'),
    text: t('friends.shareText', { code: myCode.value }),
    url: link,
  })
}

function onCodeInput() {
  // 대문자/숫자만 허용 + 자동 대문자화
  inputCode.value = inputCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

async function onAcceptInvite() {
  if (accepting.value || inputCode.value.length !== 8) return
  accepting.value = true
  try {
    const { data, error } = await sdk.acceptInvite({
      client,
      path: { code: inputCode.value },
    })
    if (error) throw new Error(errMsg(error, t('friends.acceptError')))
    const result = castData<InviteAcceptResponse>(data)
    const reward = (result as { reward?: { specialCoins?: number } })?.reward?.specialCoins ?? 5
    toast.success(t('friends.acceptSuccess', { reward }))
    trackInviteAccepted({ specialCoinsRewarded: reward })
    inputCode.value = ''
    // 사용자 재화 갱신
    await userStore.fetchMe()
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    accepting.value = false
  }
}
</script>
