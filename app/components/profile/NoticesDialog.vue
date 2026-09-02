<template>
  <!-- M1 공지사항 팝업 (Figma 393×454): 헤더 "ⓘ 공지사항" + X, 행 = 제목(굵게) / 부제(회색) / 우측 날짜.
       데이터는 정적 public/notices.json(§4-6 기본값) — 배포로 갱신. 실패·0건이면 "공지사항이 없어요".
       bespoke 오버레이 규약: role="dialog" aria-modal + useDialogFocusTrap + Android 뒤로가기 등록.
       TODO(C4 머지 후): 공용 Modal 리스킨(393, r24, 연파랑 원형 X) 로 교체 검토. -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        ref="rootEl"
        class="fixed inset-0 z-[9997] flex items-center justify-center px-5 bg-black/45 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notices-title"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-[393px] h-[454px] max-h-[85dvh] rounded-[24px] bg-apjek-surface flex flex-col overflow-hidden">
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-[20px] pt-[20px] pb-[12px]">
            <h3 id="notices-title" class="flex items-center gap-[8px] text-[18px] font-bold text-apjek-text tracking-[-0.4px]">
              <svg width="18" height="18" fill="none" viewBox="0 0 16 16" class="text-apjek-text">
                <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path d="M8 10.6667V8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path d="M8 5.33333H8.00667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              </svg>
              공지사항
            </h3>
            <button
              type="button"
              class="group size-11 -m-[6px] flex items-center justify-center"
              aria-label="닫기"
              @click="emit('close')"
            >
              <span class="size-8 rounded-full bg-apjek-blue-soft flex items-center justify-center transition-transform group-active:scale-90">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="text-apjek-blue-deep">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </span>
            </button>
          </div>

          <!-- 목록 -->
          <div class="flex-1 overflow-y-auto px-[20px] pb-[20px]">
            <div v-if="loading" class="flex flex-col gap-[8px]" aria-busy="true">
              <div
                v-for="n in 3"
                :key="n"
                class="flex items-start justify-between gap-[12px] py-[14px]"
                data-testid="notice-skeleton-row"
              >
                <div class="min-w-0 flex-1 animate-pulse">
                  <div class="h-[20px] w-2/3 rounded bg-apjek-bg" />
                  <div class="mt-[2px] h-[17px] w-5/6 rounded bg-apjek-bg" />
                </div>
                <div class="mt-[2px] h-[17px] w-[52px] shrink-0 rounded bg-apjek-bg animate-pulse" />
              </div>
            </div>
            <div v-else-if="notices.length === 0" class="h-full flex flex-col items-center justify-center gap-2 text-apjek-text-faint py-10">
              <span class="text-[32px]" aria-hidden="true">📭</span>
              <p class="text-[13px]">공지사항이 없어요</p>
            </div>
            <ul v-else class="flex flex-col divide-y divide-apjek-border">
              <li
                v-for="n in notices"
                :key="n.id"
                class="flex items-start justify-between gap-[12px] py-[14px]"
                data-testid="notice-row"
              >
                <div class="min-w-0">
                  <p class="text-[14px] font-bold text-apjek-text tracking-[-0.2px] leading-[20px]">{{ n.title }}</p>
                  <p class="mt-[2px] text-[12px] text-apjek-text-sub tracking-[-0.2px] leading-[17px] whitespace-pre-line">{{ n.body }}</p>
                </div>
                <span class="shrink-0 text-[11px] text-apjek-text-faint whitespace-nowrap pt-[2px]">{{ formatDate(n.date) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/** 정적 공지 1건 — public/notices.json 행 계약 */
interface NoticeItem {
  id: string | number
  title: string
  body: string
  /** YYYY-MM-DD */
  date: string
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const notices = ref<NoticeItem[]>([])
const loading = ref<boolean>(false)
let loadedOnce: boolean = false

async function loadNotices(): Promise<void> {
  if (loadedOnce) return
  loading.value = true
  try {
    // TODO(공지 API 결정 시): admin API 로 교체. 지금은 정적 JSON(배포로 갱신).
    const raw = await $fetch<unknown>('/notices.json', { cache: 'no-store' })
    const list = Array.isArray(raw) ? (raw as NoticeItem[]) : []
    notices.value = list
      .filter((n) => n && typeof n.title === 'string')
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    loadedOnce = true
  }
  catch {
    // 정적 파일 부재·네트워크 실패 → 빈 상태("공지사항이 없어요"). 다음 오픈 때 다시 시도한다.
    notices.value = []
  }
  finally {
    loading.value = false
  }
}

/** "2026-08-10" → "8월 10일" (Figma 표기) — 파싱 실패 시 원문 */
function formatDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? '')
  if (!m) return d ?? ''
  return `${Number(m[2])}월 ${Number(m[3])}일`
}

watch(() => props.open, (open) => {
  if (open) void loadNotices()
}, { immediate: true })

// focus trap + ESC + 배경 스크롤 잠금 (공용 프리미티브 합성)
const rootEl = ref<HTMLElement | null>(null)
useDialogFocusTrap(rootEl, toRef(props, 'open'), () => emit('close'))

// Android 하드웨어 뒤로가기 — 열려 있는 동안은 이 팝업부터 닫는다.
const { pushBackHandler } = useBackButtonStack()
let unregisterBack: (() => void) | null = null
watch(() => props.open, (open) => {
  if (open) {
    unregisterBack = pushBackHandler(() => emit('close'))
  }
  else {
    unregisterBack?.()
    unregisterBack = null
  }
})
onBeforeUnmount(() => {
  unregisterBack?.()
  unregisterBack = null
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
