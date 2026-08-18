<!--
  알림함 팝업 (아프젝 T1-FE, fig-notif 기준 — 등록명 NotificationsCenter).
  열 때 listNotifications 첫 페이지 로드 후 markNotificationsRead(ids:[]=전체) 로 읽음 처리.
  백엔드 컨트롤러 구현 중이라 실서버에서 404 가 날 수 있다 — 모든 호출은 조용한 실패
  처리(토스트/크래시 없음)로 홈 동작을 깨지 않는다. 읽음 성공 시 read emit → 부모가 뱃지 클리어.
-->
<template>
  <Teleport to="body">
    <Transition name="notif-dialog">
      <div v-if="open" ref="root" class="fixed inset-0 z-[9997]" role="dialog" aria-modal="true" aria-label="알림">
        <div class="fixed inset-0 bg-black/40" @click="emit('close')" />
        <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto">
          <div
            class="rounded-3xl p-6 shadow-2xl flex flex-col"
            style="background: rgba(255,255,255,0.96); backdrop-filter: blur(20px); max-height: min(70dvh, 560px)"
          >
            <div class="flex items-center justify-between pb-4 border-b border-black/10">
              <div class="flex items-center gap-2">
                <!-- lucide:bell 은 clientBundle 미등재 — 인라인 SVG (nuxt.config 수정 금지 제약) -->
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                <h3 class="font-bold text-base" style="color: #111111">알림</h3>
              </div>
              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center"
                style="background: var(--color-apjek-blue-soft)"
                aria-label="닫기"
                @click="emit('close')"
              >
                <Icon name="lucide:x" class="w-4 h-4" style="color: var(--color-apjek-blue)" />
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <p v-if="loading" class="py-8 text-center text-xs text-apjek-text-faint">불러오는 중…</p>
              <!-- 실패를 빈 상태("알림이 없어요")로 위장하지 않는다 — 조용하되 구분 표시 -->
              <p v-else-if="failed" class="py-8 text-center text-xs text-apjek-text-faint">알림을 불러오지 못했어요</p>
              <p v-else-if="items.length === 0" class="py-8 text-center text-xs text-apjek-text-faint">알림이 없어요</p>
              <template v-else>
                <div v-for="n in items" :key="n.id" class="py-3 border-b border-black/5 last:border-b-0">
                  <div class="flex items-start justify-between gap-3">
                    <!-- 미읽음(readAt=null) 강조 — 볼드 + 마젠타 점. 목록은 읽음 처리 전 스냅샷이라
                         이번 오픈에는 강조가 보이고 다음 오픈부터 읽음 표시가 된다. -->
                    <p class="text-sm min-w-0" :class="isUnread(n) ? 'font-bold text-apjek-text' : 'font-semibold text-apjek-text-sub'">
                      <span v-if="isUnread(n)" class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1" style="background: #f043c8" />{{ n.title }}
                    </p>
                    <span class="text-[11px] shrink-0 text-apjek-text-faint">{{ relativeTime(n.createdAt) }}</span>
                  </div>
                  <p class="text-xs mt-0.5 text-apjek-text-faint">{{ n.body }}</p>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { NotificationResponse, PagedNotificationResponse } from '@terraworld-it/openapi-frontend'

const props = defineProps<{
  /** 팝업 표시 여부 — 상태는 부모가 소유. 닫기 요청은 close emit 로만 전달. */
  open: boolean
}>()

const emit = defineEmits<{ close: [], read: [] }>()

const { sdk, client } = useOpenApi()

const items = shallowRef<NotificationResponse[]>([])
const loading = ref<boolean>(false)
const failed = ref<boolean>(false)

// focus trap + 배경 스크롤 잠금 + ESC — 공용 프리미티브 합성 (bespoke 오버레이 규약)
const root = ref<HTMLElement | null>(null)
useDialogFocusTrap(root, computed<boolean>(() => props.open), () => emit('close'))

// Android 하드웨어 뒤로가기 — 열려있는 동안 라우트 back/앱종료보다 먼저 close 를 요청
// (CommonBottomSheet 와 동일 패턴 — 열린 채 라우트 이탈 시 stale handler 방지 정리 포함).
const { pushBackHandler } = useBackButtonStack()
let unregisterBack: (() => void) | null = null
watch(() => props.open, (open) => {
  if (open) {
    unregisterBack = pushBackHandler(() => emit('close'))
    void loadAndMarkRead()
  }
  else {
    unregisterBack?.()
    unregisterBack = null
  }
}, { immediate: true })
onBeforeUnmount(() => {
  unregisterBack?.()
  unregisterBack = null
})

async function loadAndMarkRead() {
  if (loading.value) return
  loading.value = true
  failed.value = false
  try {
    const { data, error } = await sdk.listNotifications({ client, query: { page: 0, size: 20 } })
    if (error) throw error
    items.value = castData<PagedNotificationResponse>(data)?.content ?? []
    // 목록 로드 성공 시에만 전체 읽음 처리(ids 빈 배열 = 전체, 멱등) — 실패는 조용히
    // 무시한다(다음 오픈 때 자연 재시도). 성공 시 read emit → 부모 뱃지 클리어.
    try {
      const { error: readError } = await sdk.markNotificationsRead({ client, body: { ids: [] } })
      if (!readError) emit('read')
    }
    catch {
      // 조용한 실패 — 읽음 처리 실패가 알림 열람을 막지 않는다
    }
  }
  catch {
    // 백엔드 미구현(404)/네트워크 실패 — 홈이 깨지면 안 되므로 팝업 내 안내만 (토스트 없음)
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

function isUnread(n: NotificationResponse): boolean {
  return !n.readAt
}

// 상대시간 — fig-notif 표기("1분전"/"3시간전"/"3일전") 그대로. 미래/비정상 시각은 "방금 전".
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return '방금 전'
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간전`
  return `${Math.floor(hours / 24)}일전`
}
</script>

<style scoped>
/* 중앙 다이얼로그 spring 근사 — index.vue 의 dialog 트랜지션과 동일 규약 (scoped 라 자체 보유) */
.notif-dialog-enter-active,
.notif-dialog-leave-active { transition: opacity 0.25s ease; }
.notif-dialog-enter-active > div:last-child,
.notif-dialog-leave-active > div:last-child { transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1); }
.notif-dialog-enter-from,
.notif-dialog-leave-to { opacity: 0; }
.notif-dialog-enter-from > div:last-child,
.notif-dialog-leave-to > div:last-child { transform: translateY(20px) scale(0.92); }

@media (prefers-reduced-motion: reduce) {
  .notif-dialog-enter-active,
  .notif-dialog-leave-active,
  .notif-dialog-enter-active > div:last-child,
  .notif-dialog-leave-active > div:last-child { transition-duration: 0.01ms; }
}
</style>
