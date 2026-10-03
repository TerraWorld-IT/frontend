<!--
  다른 회원 신고·차단 시트 (App Store 가이드라인 1.2 — 신고 수단·차단 수단). 등록명: CommonReportBlockSheet.
  - menu: [신고하기] / [차단하기]
  - report: 사유 선택 → 신고 메일(mailto:supportEmail) 열기. 메일 앱이 안 열리는 환경을 위해 주소·본문 복사 안내를 함께 보인다.
  - block: 확인 후 useUserBlocks 로 이 기기의 차단 목록에 추가(상대방에게 알리지 않음) → blocked emit.
  focus trap·스크롤 잠금·뒤로가기·ESC 는 CommonBottomSheet 내장. 방문 모달 위에서 열려도 나중에 마운트된 Teleport 가 위에 쌓인다.
-->
<template>
  <CommonBottomSheet :open="open" :ariaLabel="$t('moderation.openMenu', { nickname: targetName })" @close="emit('close')">
    <div class="px-5 pt-1 flex flex-col gap-[14px]" data-testid="report-block-sheet">
      <!-- ① 메뉴 -->
      <template v-if="step === 'menu'">
        <h3 class="font-bold text-[18px] text-apjek-text tracking-[-0.44px] pr-10 truncate">{{ $t('moderation.menuTitle', { nickname: targetName }) }}</h3>
        <button
          type="button"
          class="w-full bg-apjek-surface rounded-[12px] flex items-center gap-[12px] p-[13px] text-left border border-apjek-border active:scale-[0.98] transition-all"
          data-testid="report-block-report"
          @click="goReport"
        >
          <Icon name="lucide:flag" class="w-5 h-5 shrink-0 text-apjek-text" aria-hidden="true" />
          <span class="flex flex-col">
            <span class="text-[14px] font-semibold text-apjek-text">{{ $t('moderation.report') }}</span>
            <span class="text-[12px] text-apjek-text-sub">{{ $t('moderation.reportDesc') }}</span>
          </span>
        </button>
        <button
          type="button"
          class="w-full bg-apjek-surface rounded-[12px] flex items-center gap-[12px] p-[13px] text-left border border-apjek-border active:scale-[0.98] transition-all"
          data-testid="report-block-block"
          @click="step = 'block'"
        >
          <Icon name="lucide:ban" class="w-5 h-5 shrink-0 text-riso-poppy" aria-hidden="true" />
          <span class="flex flex-col">
            <span class="text-[14px] font-semibold text-apjek-text">{{ $t('moderation.block') }}</span>
            <span class="text-[12px] text-apjek-text-sub">{{ $t('moderation.blockDesc') }}</span>
          </span>
        </button>
      </template>

      <!-- ② 신고 — 사유 선택 + 신고 메일 -->
      <template v-else-if="step === 'report'">
        <h3 class="font-bold text-[18px] text-apjek-text tracking-[-0.44px] pr-10">{{ $t('moderation.reasonTitle') }}</h3>
        <fieldset class="flex flex-col gap-[8px]">
          <legend class="sr-only">{{ $t('moderation.reasonTitle') }}</legend>
          <label
            v-for="r in REPORT_REASONS"
            :key="r"
            class="w-full flex items-center gap-[10px] p-[13px] rounded-[12px] border cursor-pointer"
            :class="reason === r ? 'border-apjek-blue bg-apjek-blue-soft' : 'border-apjek-border bg-apjek-surface'"
          >
            <input v-model="reason" type="radio" name="report-reason" :value="r" class="w-4 h-4 accent-apjek-blue" :data-testid="`report-reason-${r}`">
            <span class="text-[14px] font-semibold text-apjek-text">{{ $t(`moderation.reason.${r}`) }}</span>
          </label>
        </fieldset>

        <template v-if="reason">
          <a
            :href="reportMailto"
            class="apjek-cta w-full h-[48px] text-[14px] flex items-center justify-center gap-[8px]"
            data-testid="report-send-mail"
          >
            <Icon name="lucide:mail" class="w-4 h-4" aria-hidden="true" />
            {{ $t('moderation.sendMail') }}
          </a>
          <p class="text-[12px] text-apjek-text-sub leading-[18px]">{{ $t('moderation.mailHint') }}</p>

          <!-- 메일 앱이 열리지 않는 환경(웹뷰·메일 계정 미설정) 대비 — 주소와 본문을 복사해 직접 보낼 수 있게 한다 -->
          <div class="rounded-[12px] bg-apjek-bg p-[12px] flex flex-col gap-[8px]" data-testid="report-mail-fallback">
            <p class="text-[12px] text-apjek-text-sub leading-[18px]">{{ $t('moderation.mailFallback') }}</p>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[13px] font-semibold text-apjek-text select-all break-all" data-testid="report-mail-address">{{ supportEmail }}</span>
              <button type="button" class="apjek-chip shrink-0 px-2.5 py-1.5 text-[12px] font-semibold active:scale-95" @click="copy(supportEmail)">
                {{ $t('moderation.copyAddress') }}
              </button>
            </div>
            <label for="report-mail-body" class="text-[12px] font-semibold text-apjek-text-sub">{{ $t('moderation.mailBodyLabel') }}</label>
            <textarea
              id="report-mail-body"
              :value="reportBody"
              readonly
              rows="6"
              class="w-full rounded-[8px] border border-apjek-border bg-apjek-surface p-[8px] text-[12px] text-apjek-text leading-[18px] resize-none"
              data-testid="report-mail-body"
            />
            <button type="button" class="apjek-chip self-end px-2.5 py-1.5 text-[12px] font-semibold active:scale-95" @click="copy(`${reportSubject}\n\n${reportBody}`)">
              {{ $t('moderation.copyBody') }}
            </button>
          </div>
        </template>

        <button type="button" class="w-full h-[44px] rounded-full text-[14px] font-semibold border border-apjek-border-strong text-apjek-text" @click="step = 'menu'">
          {{ $t('common.back') }}
        </button>
      </template>

      <!-- ③ 차단 확인 -->
      <template v-else>
        <h3 class="font-bold text-[18px] text-apjek-text tracking-[-0.44px] pr-10 break-words">{{ $t('moderation.blockConfirmTitle', { nickname: targetName }) }}</h3>
        <p class="text-[13px] text-apjek-text-sub leading-[20px]" data-testid="block-notice">{{ $t('moderation.blockNotice') }}</p>
        <button
          type="button"
          class="w-full h-[48px] rounded-full text-[14px] font-semibold text-white bg-riso-poppy active:scale-[0.98] transition-all"
          data-testid="block-confirm"
          @click="confirmBlock"
        >
          {{ $t('moderation.blockConfirm') }}
        </button>
        <button type="button" class="w-full h-[44px] rounded-full text-[14px] font-semibold border border-apjek-border-strong text-apjek-text" @click="step = 'menu'">
          {{ $t('common.cancel') }}
        </button>
      </template>
    </div>
  </CommonBottomSheet>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useUserStore } from '~/stores/user'

/** 신고 사유 — 메일 본문에는 운영팀이 읽는 한국어 라벨을 고정으로 쓴다. */
const REPORT_REASONS = ['abuse', 'sexual', 'spam', 'other'] as const
type ReportReason = typeof REPORT_REASONS[number]
const REASON_MAIL_LABEL: Record<ReportReason, string> = {
  abuse: '욕설·비하',
  sexual: '성적·불쾌한 내용',
  spam: '사칭·스팸',
  other: '기타',
}

const props = defineProps<{
  open: boolean
  /** 신고·차단 대상. nickname 은 화면에 보이는 표시(전체 랭킹이면 가린 표시) 그대로 넘긴다. */
  target: { userId: string, nickname: string } | null
}>()

const emit = defineEmits<{
  close: []
  blocked: [userId: string]
}>()

const { t } = useI18n()
const toast = useToast()
const userStore = useUserStore()
const { block, isBlocked } = useUserBlocks()
const runtimeConfig = useRuntimeConfig()

const step = ref<'menu' | 'report' | 'block'>('menu')
const reason = ref<ReportReason | null>(null)
const reportedAt = ref<string>('')

const targetName = computed<string>(() => props.target?.nickname || '?')
const supportEmail = computed<string>(() => {
  const v = (runtimeConfig.public as { supportEmail?: string }).supportEmail
  return v && v.trim() ? v.trim() : 'oharapass@gmail.com'
})

const reportSubject = computed<string>(() => `[TerraWorld 신고] ${targetName.value}`)
const reportBody = computed<string>(() => [
  `신고 대상 닉네임: ${targetName.value}`,
  `신고 대상 회원 ID: ${props.target?.userId ?? ''}`,
  `신고 사유: ${reason.value ? REASON_MAIL_LABEL[reason.value] : ''}`,
  `신고자 회원 ID: ${userStore.me?.userId ?? '확인 불가'}`,
  `신고자 닉네임: ${userStore.me?.nickname ?? '확인 불가'}`,
  `신고 시각: ${reportedAt.value}`,
  '',
  '상세 내용(선택):',
  '',
].join('\n'))
const reportMailto = computed<string>(() =>
  `mailto:${supportEmail.value}?subject=${encodeURIComponent(reportSubject.value)}&body=${encodeURIComponent(reportBody.value)}`)

// 열 때마다 메뉴부터 다시 시작한다.
watch(() => props.open, (open) => {
  if (!open) return
  step.value = 'menu'
  reason.value = null
})

function goReport() {
  reportedAt.value = dayjs().format('YYYY-MM-DD HH:mm:ss Z')
  step.value = 'report'
}

async function copy(text: string) {
  if (!import.meta.client) return
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(text)
    toast.success(t('moderation.copied'))
  }
  catch {
    // 웹뷰 권한 거부 등으로 실패하면 화면의 주소·본문을 직접 복사하도록 안내한다(본문은 readonly textarea 로 선택 가능).
    toast.info(t('moderation.copyFailed'))
  }
}

function confirmBlock() {
  const target = props.target
  if (!target) return
  if (isBlocked(target.userId)) {
    toast.info(t('moderation.alreadyBlocked'))
    emit('blocked', target.userId)
    emit('close')
    return
  }
  const { added, saved } = block(target)
  if (!added) {
    toast.error(t('moderation.blockUnavailable'))
    return
  }
  if (saved) toast.success(t('moderation.blocked'))
  else toast.info(t('moderation.blockNotSaved'))
  emit('blocked', target.userId)
  emit('close')
}
</script>
