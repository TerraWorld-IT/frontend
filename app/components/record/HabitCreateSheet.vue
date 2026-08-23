<template>
  <!-- 습관 생성 3단계 바텀시트 (R2, Figma 393×620) — ① 유형 선택 ② 이름 ③ (친구) 요청 대상.
       TODO(C4 머지 후): 공용 BottomSheet 가 620px 고정 + X 로 바뀌면 별도 조정 없이 그대로 탄다. -->
  <CommonBottomSheet :open="open" ariaLabel="습관 기록 생성" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-2 px-5 py-3 border-b border-apjek-border shrink-0 mr-9">
        <span class="text-[18px]">🌸</span>
        <span class="font-bold text-[16px] text-apjek-text">습관 기록 생성</span>
      </div>
    </template>

    <div class="px-5 pt-4 pb-2 flex flex-col gap-[16px]">
      <!-- ① 유형 선택 -->
      <template v-if="step === 1">
        <!-- 일러스트 자리 (고양이 정령 + 달팽이 / 친구 2마리) — TODO(자산): 디자이너 제공 이미지로 교체 -->
        <div
          class="w-full h-[132px] rounded-[20px] flex items-center justify-center text-[44px]"
          style="background: radial-gradient(circle at 50% 40%, #ffe3f3 0%, var(--color-apjek-sparkle-bg) 60%, #fff 100%)"
          aria-hidden="true"
        >
          {{ mode === 'friend' ? '🐱🐱' : '🐱🐌' }}
        </div>
        <p class="text-[14px] text-apjek-text-sub leading-[20px] text-center whitespace-pre-line">{{ introText }}</p>

        <div class="flex gap-[8px]">
          <button
            type="button"
            class="flex-1 h-[44px] rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-[6px] transition-all active:scale-[0.97]"
            :class="mode === 'solo' ? 'bg-apjek-cta text-white' : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
            :aria-pressed="mode === 'solo'"
            @click="mode = 'solo'"
          >
            <Icon name="lucide:sparkles" class="w-4 h-4" />
            나의 습관 기록
          </button>
          <button
            type="button"
            class="flex-1 h-[44px] rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-[6px] transition-all active:scale-[0.97]"
            :class="mode === 'friend' ? 'bg-apjek-cta text-white' : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
            :aria-pressed="mode === 'friend'"
            @click="mode = 'friend'"
          >
            <Icon name="lucide:users" class="w-4 h-4" />
            친구와 함께 기록
          </button>
        </div>

        <button
          type="button"
          class="w-full h-[48px] rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]"
          :class="mode ? 'bg-apjek-blue text-white' : 'bg-apjek-blue-soft text-apjek-blue-deep/60 cursor-default'"
          :disabled="!mode"
          @click="goStep2"
        >
          다음
        </button>
      </template>

      <!-- ② 습관 이름 -->
      <template v-else-if="step === 2">
        <div
          class="w-full h-[100px] rounded-[20px] flex items-center justify-center text-[40px]"
          style="background: radial-gradient(circle at 50% 40%, #ffe3f3 0%, var(--color-apjek-sparkle-bg) 60%, #fff 100%)"
          aria-hidden="true"
        >
          🐱
        </div>
        <p class="text-[14px] text-apjek-text-sub leading-[20px] text-center whitespace-pre-line">{{ nameGuideText }}</p>

        <div>
          <label for="habit-create-title" class="text-[12px] font-semibold text-apjek-text-sub mb-[6px] block">습관 이름</label>
          <input
            id="habit-create-title"
            v-model="title"
            placeholder="예: 독서, 공부, 운동..."
            maxlength="30"
            class="w-full h-[48px] rounded-[12px] px-[16px] text-[14px] outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
            @keydown.enter.exact.prevent="onPrimary"
          >
        </div>

        <!-- 이름 입력 전 비활성 (댓글 #48) -->
        <button
          type="button"
          class="w-full h-[48px] rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]"
          :class="canProceedName ? 'bg-apjek-blue text-white' : 'bg-apjek-blue-soft text-apjek-blue-deep/60 cursor-default'"
          :disabled="!canProceedName || busy"
          @click="onPrimary"
        >
          {{ mode === 'friend' ? '다음' : '생성 하기' }}
        </button>
      </template>

      <!-- ③ 친구 선택 (친구 모드만) -->
      <template v-else>
        <p class="text-[14px] text-apjek-text-sub leading-[20px] text-center">
          함께할 친구를 선택해 요청해 주세요!<br>친구가 수락하면 기록이 자동으로 생성돼요.
        </p>

        <div v-if="friends.length === 0" class="text-[13px] text-apjek-text-faint text-center py-[16px]">
          함께 할 친구가 없어요.
          <NuxtLink to="/friends" class="text-apjek-blue underline font-semibold">친구 초대하기</NuxtLink>
        </div>

        <!-- 가로 스크롤 친구 카드 — 선택 시 해당 카드 "요청 대기 중", 나머지 비활성 (댓글 #49) -->
        <div v-else class="flex gap-[10px] overflow-x-auto scrollbar-hide -mx-5 px-5 pb-[4px]">
          <div
            v-for="f in friends"
            :key="f.userId"
            class="shrink-0 w-[128px] rounded-[16px] border p-[12px] flex flex-col items-center gap-[10px] transition-all"
            :class="selectedFriendId !== null && selectedFriendId !== f.userId
              ? 'border-apjek-border bg-apjek-bg opacity-50'
              : 'border-apjek-border-strong bg-apjek-surface'"
          >
            <div
              class="size-[44px] rounded-full flex items-center justify-center text-[20px]"
              style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)"
              aria-hidden="true"
            >
              🌍
            </div>
            <p class="text-[13px] font-semibold text-apjek-text truncate w-full text-center">{{ f.nickname }}</p>
            <button
              type="button"
              class="w-full h-[32px] rounded-full text-[12px] font-semibold transition-all active:scale-95 disabled:cursor-default"
              :class="selectedFriendId === f.userId
                ? 'bg-apjek-cta text-white'
                : selectedFriendId === null
                  ? 'bg-apjek-cta text-white'
                  : 'bg-apjek-border text-apjek-text-faint'"
              :disabled="selectedFriendId !== null && selectedFriendId !== f.userId"
              @click="toggleFriend(f.userId)"
            >
              {{ selectedFriendId === f.userId ? '요청 대기 중' : '요청하기' }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="w-full h-[48px] rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]"
          :class="selectedFriendId ? 'bg-apjek-blue text-white' : 'bg-apjek-blue-soft text-apjek-blue-deep/60 cursor-default'"
          :disabled="!selectedFriendId || busy"
          @click="submit"
        >
          {{ busy ? '요청 보내는 중...' : '요청 보내기' }}
        </button>
      </template>
    </div>
  </CommonBottomSheet>
</template>

<script setup lang="ts">
import type { FriendInfo } from '@terraworld-it/openapi-frontend'
import { HABIT_REWARD_SPARKLE } from '~/utils/habitState'

/**
 * 습관 기록 생성 바텀시트 (R2). 유형(나의/친구) → 이름(≤30자, 생성 후 수정 불가) → (친구) 요청 대상.
 * API 호출·토스트는 부모(record 페이지) 책임 — 본 시트는 입력 수집 후 submit 으로 위임한다.
 * TODO(N-B5 스펙 머지 후): 친구 요청은 createHabit(friendUserId) 가 PENDING 트래커를 만들고
 * 상대 수락(accept) 으로 ACTIVE 가 된다. 현행은 생성 즉시 ACTIVE 이며 상대가 같은 친구로
 * 습관을 만들면 연동된다(폴리필 "요청 대기" 표시는 useHabits/habitState 참조).
 */
const props = defineProps<{
  open: boolean
  friends: FriendInfo[]
  /** 생성 요청 진행 중 (부모 busy) */
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { title: string; friendUserId: string | null }]
}>()

type Mode = 'solo' | 'friend'
const step = ref<1 | 2 | 3>(1)
const mode = ref<Mode | null>(null)
const title = ref<string>('')
const selectedFriendId = ref<string | null>(null)

const introText = computed<string>(() => mode.value === 'friend'
  ? `1주일 동안 친구와 함께 실천 트래커를 완성해보세요!\n완료 시 반짝이 ${HABIT_REWARD_SPARKLE.friend}개를 획득합니다.`
  : `1주일 동안 습관을 실천하고 트래커로 기록합니다.\n완료 시 반짝이 ${HABIT_REWARD_SPARKLE.solo}개를 획득합니다.`)

const nameGuideText = computed<string>(() => mode.value === 'friend'
  ? '1주일 동안 친구와 함께 실천할 습관 이름을 적어 주세요.\n완료 또는 중단 전에 이름을 수정할 수 없습니다.'
  : '1주일 동안 실천할 습관 이름을 적어 주세요.\n완료 또는 중단 전에 이름을 수정할 수 없습니다.')

const canProceedName = computed<boolean>(() => title.value.trim().length > 0)

function reset() {
  step.value = 1
  mode.value = null
  title.value = ''
  selectedFriendId.value = null
}

// 열 때마다 초기화 — 이전 시도의 입력 잔존 방지
watch(() => props.open, (open) => {
  if (open) reset()
})

function goStep2() {
  if (!mode.value) return
  step.value = 2
}

function onPrimary() {
  if (!canProceedName.value || props.busy) return
  if (mode.value === 'friend') {
    void dismissKeyboard()
    step.value = 3
    return
  }
  void dismissKeyboard()
  emit('submit', { title: title.value.trim(), friendUserId: null })
}

function toggleFriend(userId: string) {
  selectedFriendId.value = selectedFriendId.value === userId ? null : userId
}

function submit() {
  if (!selectedFriendId.value || props.busy) return
  emit('submit', { title: title.value.trim(), friendUserId: selectedFriendId.value })
}
</script>
