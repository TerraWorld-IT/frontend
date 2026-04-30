<template>
  <div class="riso-grain min-h-screen px-4 py-4 space-y-6">
    <!-- 헤더 -->
    <div class="space-y-1">
      <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
        친구
      </h2>
      <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
        초대 코드를 공유하고 함께 테라리움을 키워보세요
      </p>
    </div>

    <!-- Section 1: 내 초대 코드 -->
    <section class="bg-white rounded-2xl p-4 riso-shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-[15px] text-riso-dark">
          내 초대 코드
        </h3>
        <span class="text-[11px] text-riso-dark/50">7일 후 만료</span>
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
              복사
            </button>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-full bg-riso-pink text-white text-[12px] font-semibold riso-shadow-sm active:scale-95"
              @click="shareMyCode"
            >
              공유
            </button>
          </div>
        </div>
        <p class="text-[12px] text-riso-dark/55 leading-[18px]">
          친구가 이 코드를 입력하면 양쪽 모두 햇살 +5를 받아요.
        </p>
      </div>

      <button
        v-else
        type="button"
        class="w-full h-12 rounded-xl bg-riso-sage text-white font-semibold text-[14px] riso-shadow-sm active:scale-95 disabled:opacity-50"
        :disabled="creating"
        @click="onCreateInvite"
      >
        {{ creating ? '발급 중…' : '초대 코드 발급하기' }}
      </button>
    </section>

    <!-- Section 2: 친구 코드 입력 -->
    <section class="bg-white rounded-2xl p-4 riso-shadow-sm space-y-3">
      <h3 class="font-semibold text-[15px] text-riso-dark">
        친구 코드 입력
      </h3>
      <p class="text-[12px] text-riso-dark/55 leading-[18px]">
        친구가 보낸 8자 코드를 입력하면 햇살 +5를 받아요.
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
        {{ accepting ? '수락 중…' : '코드 수락하기' }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { InviteAcceptResponse, InviteResponse } from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'

definePageMeta({ middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { share: nativeShare } = useNative()
const userStore = useUserStore()
const { trackInviteCreated, trackInviteAccepted } = useGtagEvents()

const myCode = ref<string>('')
const myExpiresAt = ref<string>('')
const inputCode = ref<string>('')
const creating = ref(false)
const accepting = ref(false)

async function onCreateInvite() {
  if (creating.value) return
  creating.value = true
  try {
    const { data, error } = await sdk.createInvite({ client })
    if (error) throw new Error(errMsg(error, '초대 코드 발급 실패'))
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
    toast.success('초대 코드가 복사되었어요')
  }
  else {
    toast.info(`초대 코드: ${myCode.value}`)
  }
}

async function shareMyCode() {
  if (!myCode.value || !import.meta.client) return
  const link = `${window.location.origin}/share/${myCode.value}`
  await nativeShare({
    title: 'TerraWorld 초대',
    text: `내 TerraWorld 친구가 되어볼래? 코드 ${myCode.value} 입력하면 양쪽 모두 햇살 +5!`,
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
    if (error) throw new Error(errMsg(error, '초대 수락 실패'))
    const result = castData<InviteAcceptResponse>(data)
    const reward = (result as { reward?: { specialCoins?: number } })?.reward?.specialCoins ?? 5
    toast.success(`친구 추가 완료! 햇살 +${reward}`)
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
