<!--
  공유하기 모달 (아프젝 T10 — Figma "공유하기 팝업" 393×407).
  헤더 "공유하기" + X, 3행 카드: SNS 공유하기 / 이미지 저장하기 / 초대코드 복사하기 (각 행 우측 칩).
  인스타 스토리 행은 네이티브 + 플러그인 환경에서만 4번째 행으로 유지(기존 동작 보존).
  실제 동작(캡처/공유/발급)은 부모가 소유 — 여기서는 emit 만 한다.
  등록명: TerrariumShareModal.
-->
<template>
  <TerrariumHomeDialog :open="open" title="공유하기" aria-label="공유하기" @close="emit('close')">
    <div class="flex flex-col gap-3">
      <button
        type="button"
        data-testid="share-sns"
        class="w-full apjek-card flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
        @click="emit('sns')"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg" style="background: var(--color-apjek-blue-soft)" aria-hidden="true">🔗</div>
        <div class="text-left flex-1 min-w-0">
          <div class="text-sm font-bold text-apjek-text">SNS 공유하기</div>
          <div class="text-xs text-apjek-text-faint">친구에게 나의 테라 사진을 공유해요</div>
        </div>
        <span class="apjek-chip shrink-0 text-xs">공유하기</span>
      </button>

      <button
        type="button"
        data-testid="share-save"
        class="w-full apjek-card flex items-center gap-3 p-4 transition-all active:scale-[0.98] disabled:opacity-50"
        :disabled="busy"
        @click="emit('save')"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg" style="background: var(--color-apjek-blue-soft)" aria-hidden="true">🖼️</div>
        <div class="text-left flex-1 min-w-0">
          <div class="text-sm font-bold text-apjek-text">이미지 저장하기</div>
          <div class="text-xs text-apjek-text-faint">나의 테라를 이미지로 저장해요</div>
        </div>
        <span class="apjek-chip shrink-0 text-xs">{{ busy ? '저장 중…' : '저장하기' }}</span>
      </button>

      <button
        type="button"
        data-testid="share-invite"
        class="w-full apjek-card flex items-center gap-3 p-4 transition-all active:scale-[0.98] disabled:opacity-50"
        :disabled="inviteCreating"
        @click="emit('invite')"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg" style="background: var(--color-apjek-blue-soft)" aria-hidden="true">🔗</div>
        <div class="text-left flex-1 min-w-0">
          <div class="text-sm font-bold text-apjek-text">초대코드 복사하기</div>
          <div class="text-xs text-apjek-text-faint">코드를 복사해서 친구를 초대해요</div>
        </div>
        <span class="apjek-chip shrink-0 text-xs">{{ inviteCreating ? '발급 중…' : '복사하기' }}</span>
      </button>

      <!-- 인스타 스토리 (네이티브 + 플러그인 환경 한정 — 기존 동작 유지, Figma 3행 뒤 4번째 행) -->
      <button
        v-if="storyShareAvailable"
        type="button"
        data-testid="share-story"
        class="w-full apjek-card flex items-center gap-3 p-4 transition-all active:scale-[0.98] disabled:opacity-50"
        :disabled="busy"
        @click="emit('story')"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background: rgba(240,146,240,0.18)">
          <Icon name="lucide:instagram" class="w-5 h-5" style="color: #f092f0" />
        </div>
        <div class="text-left flex-1 min-w-0">
          <div class="text-sm font-bold text-apjek-text">인스타 스토리에 올리기</div>
          <div class="text-xs text-apjek-text-faint">테라리움 스티커를 스토리 카메라 위에 올려요</div>
        </div>
        <span class="apjek-chip shrink-0 text-xs">올리기</span>
      </button>
    </div>
  </TerrariumHomeDialog>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  /** 캡처 진행 중(이미지 저장/스토리 공유 버튼 비활성) */
  busy: boolean
  /** 초대코드 발급 진행 중 */
  inviteCreating: boolean
  /** 인스타 스토리 직공유 가능 환경(네이티브 + 플러그인) */
  storyShareAvailable: boolean
}>()

const emit = defineEmits<{ close: [], sns: [], save: [], invite: [], story: [] }>()
</script>
