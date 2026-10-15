<template>
  <aside aria-label="개정 안내" class="space-y-2 rounded-lg border border-riso-dark/20 p-4 text-sm leading-relaxed">
    <h2 class="font-semibold">{{ effective ? '개정 시행 안내' : '개정 예정 공지' }}</h2>
    <p>공고일: 2026-10-14 · 시행일: 2026-10-23 00:00 (한국 시간). 2026-10-15 시행일 정정 공고: 2026.11.13 → 2026.10.23. 개정 공고일 현재 운영·테스트 계정 외에 가입한 회원이 없어 30일 사전 고지를 받을 기존 회원이 없으므로 시행일을 앞당깁니다.</p>
    <p>iOS 앱 보상형 광고 도입에 따라 Google 광고 SDK의 수집 항목·국외 이전·맞춤형 광고 조건과 이용약관의 광고 조항을 안내합니다.</p>
    <p>맞춤형 광고는 ATT 허용과 맞춤형 광고 동의가 모두 있을 때만 요청합니다. 그 외에는 비맞춤형 광고를 요청합니다. 앱의 동의 철회는 맞춤형 광고만 중단하며, IDFA 제공을 막으려면 iOS 설정에서 추적(ATT)을 거부해야 합니다.</p>
    <div class="flex flex-wrap gap-3">
      <button type="button" class="underline py-2" :aria-pressed="!modelValue" @click="$emit('update:modelValue', false)">
        {{ effective ? '직전 본문 보기 (2026-10-03)' : '현행 본문 보기 (2026-10-03)' }}
      </button>
      <button type="button" class="underline py-2" :aria-pressed="modelValue" @click="$emit('update:modelValue', true)">
        {{ effective ? '개정 본문 보기 (2026-10-23)' : '개정 예정 본문 전체 보기 (2026-10-23)' }}
      </button>
    </div>
    <p aria-live="polite">현재 표시: {{ modelValue ? '2026-10-23 개정 본문' : '2026-10-03 본문' }}</p>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ effective: boolean, modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
