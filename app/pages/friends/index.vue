<template>
  <div class="min-h-screen space-y-5">
    <!-- 헤더 -->
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-apjek-text tracking-[-0.45px]">
        {{ $t('friends.title') }}
      </h2>
      <p class="text-[14px] leading-[20px] text-apjek-text-sub tracking-[-0.15px]">
        {{ $t('friends.subtitle') }}
      </p>
    </div>

    <!-- Section 1: 내 초대 코드 -->
    <section class="apjek-card p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="apjek-section-title text-[15px]">
          {{ $t('friends.myCode') }}
        </h3>
        <span class="text-[11px] text-apjek-text-faint">{{ $t('friends.expiresDays') }}</span>
      </div>

      <div v-if="myCode" class="space-y-3">
        <div class="bg-apjek-bg rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <code class="font-mono font-bold text-[20px] tracking-[3px] text-apjek-text">
            {{ myCode }}
          </code>
          <div class="flex gap-1.5 shrink-0">
            <button
              type="button"
              class="apjek-chip px-2.5 py-1.5 text-[12px] font-semibold active:scale-95"
              @click="copyMyCode"
            >
              {{ $t('friends.copy') }}
            </button>
            <button
              type="button"
              class="apjek-chip apjek-chip-active px-2.5 py-1.5 text-[12px] font-semibold active:scale-95"
              @click="shareMyCode"
            >
              {{ $t('common.share') }}
            </button>
          </div>
        </div>
        <p class="text-[12px] text-apjek-text-sub leading-[18px]">
          {{ $t('friends.codeHint') }}
        </p>
      </div>

      <button
        v-else
        type="button"
        data-testid="friends-create-code"
        class="apjek-cta w-full h-12 text-[14px] active:scale-[0.98]"
        :disabled="creating"
        @click="onCreateInvite"
      >
        {{ creating ? $t('friends.creating') : $t('friends.createCode') }}
      </button>
    </section>

    <!-- Section 2: 친구 코드 입력 -->
    <section class="apjek-card p-4 space-y-3">
      <h3 class="apjek-section-title text-[15px]">
        {{ $t('friends.enterCode') }}
      </h3>
      <p class="text-[12px] text-apjek-text-sub leading-[18px]">
        {{ $t('friends.enterCodeHint') }}
      </p>
      <input
        v-model="inputCode"
        type="text"
        maxlength="8"
        placeholder="ABCD1234"
        class="w-full h-12 px-4 rounded-xl bg-apjek-bg border border-apjek-border text-apjek-text font-mono tracking-[3px] text-center uppercase text-[18px] focus:outline-none focus:ring-2 focus:ring-apjek-blue"
        @input="onCodeInput"
      >
      <button
        type="button"
        class="apjek-cta w-full h-12 text-[14px] active:scale-[0.98]"
        :disabled="accepting || inputCode.length !== 8"
        @click="onAcceptInvite"
      >
        {{ accepting ? $t('friends.accepting') : $t('friends.acceptCode') }}
      </button>
    </section>

    <!-- Section 3: 내 친구 목록 -->
    <section class="apjek-card p-4 space-y-3">
      <h3 class="apjek-section-title text-[15px] flex items-center gap-1.5">
        <Icon name="lucide:users" class="w-4 h-4" aria-hidden="true" />
        {{ $t('friends.listTitle') }}
        <span v-if="!friendsLoading && !friendsError && friends.length > 0" class="text-[13px] font-normal text-apjek-text-faint">({{ friends.length }})</span>
      </h3>

      <!-- 로딩 -->
      <div v-if="friendsLoading" class="py-6 flex justify-center">
        <CommonLoading />
      </div>

      <!-- 에러 — SDK {error} 를 무시하면 실패가 "친구 없음"으로 위장된다 (audit C4-5) -->
      <div v-else-if="friendsError" class="py-4 flex flex-col items-center gap-2.5">
        <p class="text-[13px] text-apjek-text-sub">{{ $t('friends.listLoadError') }}</p>
        <button
          type="button"
          class="apjek-cta px-4 py-2 text-[12px] active:scale-95"
          @click="loadFriends"
        >
          {{ $t('common.retry') }}
        </button>
      </div>

      <!-- 빈 상태 -->
      <p
        v-else-if="friends.length === 0"
        class="text-[13px] text-apjek-text-sub leading-[18px] py-4 text-center"
      >
        {{ $t('friends.noFriends') }}
      </p>

      <!-- 친구 카드 목록 (fig 더보기 탭 친구목록 행 참조 — 연회색 행 + 다크 미니 필 버튼) -->
      <ul v-else class="space-y-2.5">
        <li
          v-for="friend in friends"
          :key="friend.userId"
          class="bg-apjek-bg rounded-[12px] px-3 py-3 flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <!-- 아바타 (닉네임 이니셜) — 텍스트-only 행의 시각 식별성 보강 (2026-07-20 #2) -->
            <span
              class="shrink-0 w-9 h-9 rounded-full bg-apjek-blue-soft text-apjek-blue-deep font-bold text-[15px] flex items-center justify-center"
              aria-hidden="true"
            >{{ friendInitial(friend.nickname) }}</span>
            <div class="min-w-0">
              <p class="font-semibold text-[14px] text-apjek-text truncate">
                {{ friend.nickname }}
              </p>
              <p class="text-[12px] text-apjek-text-faint">
                {{ $t('friends.likeCount', { n: friend.likeCount }) }}
              </p>
            </div>
          </div>
          <div class="flex gap-1.5 shrink-0">
            <!-- 놀러가기 — 다크 미니 필 (fig 친구목록 행 버튼) -->
            <button
              type="button"
              class="apjek-cta px-3 py-1.5 text-[11px] active:scale-95"
              :disabled="visitingId === friend.userId"
              @click="onVisit(friend)"
            >
              {{ $t('friends.visit') }}
            </button>
            <!-- 좋아요 — 칩 토글 (활성=연블루) -->
            <button
              type="button"
              class="apjek-chip px-2.5 py-1.5 text-[12px] font-semibold active:scale-95"
              :class="friend.liked ? 'apjek-chip-active' : ''"
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

    <!-- 놀러가기 모달 — 친구 테라리움 실렌더 (placeholder 승격) -->
    <FriendsVisitModal
      :open="visitModalOpen"
      :friend="visitFriend"
      :terrarium="visitTerrarium"
      :liking="likingId !== null"
      @close="visitModalOpen = false"
      @toggle-like="visitFriend && onToggleLike(visitFriend)"
    />
  </div>
</template>

<script setup lang="ts">
import type { InviteAcceptResponse, InviteResponse, TerrariumResponse } from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { sdk, client } = useOpenApi()
const toast = useToast()
const { share: nativeShare } = useNative()
const userStore = useUserStore()
const { trackInviteCreated, trackInviteAccepted } = useGtagEvents()

const myCode = ref<string>('')
const myExpiresAt = ref<string>('')
const inputCode = ref<string>('')
const creating = ref<boolean>(false)
const accepting = ref<boolean>(false)

// --- 친구 목록 (P-FRIEND, @Hidden endpoint → useInternalApi) ---
interface FriendItem {
  userId: string
  nickname: string
  likeCount: number
  liked?: boolean
}

const friends = ref<FriendItem[]>([])
const friendsLoading = ref<boolean>(false)
const friendsError = ref<boolean>(false)
const likingId = ref<string | null>(null)
const visitingId = ref<string | null>(null)
const visitModalOpen = ref<boolean>(false)
const visitFriend = ref<FriendItem | null>(null)
const visitTerrarium = ref<TerrariumResponse | null>(null)

function friendInitial(nickname: string): string {
  return (nickname || '?').trim().charAt(0).toUpperCase() || '?'
}

async function loadFriends() {
  friendsLoading.value = true
  friendsError.value = false
  try {
    // 2026-06-04: off-spec raw fetch → 생성 SDK(listFriends). spec/codegen 편입.
    // hey-api SDK 는 HTTP 에러를 throw 하지 않고 {error} 로 반환 — 미검사 시 실패가
    // "친구 없음" 빈 상태로 위장된다 (audit C4-5).
    const { data, error } = await sdk.listFriends({ client })
    if (error) throw error
    const list = castData<FriendItem[]>(data)
    friends.value = (list ?? []).map(f => ({ ...f, liked: f.liked ?? false }))
  }
  catch {
    friendsError.value = true
  }
  finally {
    friendsLoading.value = false
  }
}

async function onToggleLike(friend: FriendItem) {
  if (likingId.value) return
  likingId.value = friend.userId
  try {
    const { data, error } = await sdk.toggleFriendLike({ client, path: { friendId: friend.userId } })
    if (error) throw error
    const result = castData<{ liked: boolean, likeCount: number }>(data)
    if (result) {
      friend.liked = result.liked
      friend.likeCount = result.likeCount
      // 모달 안에서 토글하면 목록 행이 안 보이므로 성공 피드백을 토스트로 준다.
      toast.success(result.liked ? '좋아요를 남겼어요 ♥' : '좋아요를 취소했어요')
    }
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
    const { data, error } = await sdk.visitFriendTerrarium({ client, path: { friendId: friend.userId } })
    if (error) throw error
    visitTerrarium.value = castData<TerrariumResponse>(data) ?? null
  }
  catch {
    // 실패를 방치하면 모달이 로딩 상태로 영구 고착된다 (audit C4-5).
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
    try {
      await navigator.clipboard.writeText(myCode.value)
      toast.success(t('friends.codeCopied'))
    }
    catch {
      // iOS/Android WebView 는 clipboard 권한 프롬프트를 사용자가 거부하거나, gesture 컨텍스트
      // 밖에서 호출되면 write 가 reject 될 수 있다 — 복사 실패를 조용히 삼키지 않고 코드를
      // 직접 보여줘 사용자가 수동으로라도 알 수 있게 한다.
      toast.info(t('friends.codeIs', { code: myCode.value }))
    }
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
    // 사용자 재화 갱신 — 초대 보상이 걸려 있으므로 TTL 캐시를 무시한다.
    await userStore.fetchMe(true)
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    accepting.value = false
  }
}
</script>
