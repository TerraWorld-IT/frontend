<template>
  <div>
    <p>{{ t('auth.analyticsNotice.summary') }}</p>
    <p v-if="legacyMember">{{ t('auth.analyticsNotice.legacyMember') }}</p>
    <details>
      <summary>{{ t('auth.analyticsNotice.details') }}</summary>
      <p>{{ t('auth.analyticsNotice.basis') }}</p>
      <p>{{ t('auth.analyticsNotice.recipient') }} <a :href="GOOGLE_PRIVACY_CONTACT">{{ GOOGLE_PRIVACY_CONTACT }}</a></p>
      <p>{{ t('auth.analyticsNotice.transfer') }}</p>
      <p>{{ t('auth.analyticsNotice.items') }}</p>
      <p>{{ t('auth.analyticsNotice.purpose') }}</p>
      <p>{{ t('auth.analyticsNotice.retention') }}</p>
      <p>{{ t('auth.analyticsNotice.refusal') }}</p>
      <p>{{ t('auth.analyticsNotice.scope') }}</p>
    </details>
  </div>
</template>

<script lang="ts">
import notices from '../../../public/notices.json'

// 서버 가입 훅이 확정하는 개정본 버전과 동일하며, 분석 게이트와 설정 안내가 함께 사용한다.
export const ANALYTICS_CONSENT_VERSION = '2026-10-23'
// 추가 공고일은 공지 원문 한 곳에서 관리한다.
export const GA4_ANNOUNCEMENT_DATE = notices.find(notice => notice.id === 4)!.date
export const GOOGLE_PRIVACY_CONTACT = 'https://support.google.com/policies/contact/general_privacy_form'
</script>

<script setup lang="ts">
defineProps<{ legacyMember?: boolean }>()
const { t } = useI18n()
</script>
