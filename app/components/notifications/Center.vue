<!--
  알림 패널 (아프젝 T1b — Figma "알림 팝업" 449×1031 풀높이, 댓글 #40 "우측 슬라이드인" — 등록명 NotificationsCenter).
  우측에서 슬라이드인 하는 풀높이 패널: 헤더 "🔔 알림" + X, 행(제목 굵게 / 부제 회색 / 우측 상대시간),
  진입/퇴장 transform 0.28s + 백드롭 페이드.
  열 때 listNotifications 첫 페이지 로드 후 markNotificationsRead(ids:[]=전체) 로 읽음 처리(유지).
  행은 type 과 무관하게 같은 모양(HABIT 포함 — 아프젝 v2 친구 습관 요청/수락/중단/연장). `route` 가 있는
  알림은 탭 시 패널을 닫고 그 경로(`/record` 등)로 이동하고, 없으면 탭해도 이동하지 않는다.
  백엔드 컨트롤러 구현 중이라 실서버에서 404 가 날 수 있다 — 모든 호출은 조용한 실패
  처리(토스트/크래시 없음)로 홈 동작을 깨지 않는다. 읽음 성공 시 read emit → 부모가 뱃지 클리어.
-->
<template>
  <Teleport to="body">
    <Transition name="notif-panel">
      <div v-if="open" ref="root" class="fixed inset-0 z-[9997]" role="dialog" aria-modal="true" aria-label="알림">
        <div class="notif-backdrop fixed inset-0 bg-black/40" @click="emit('close')" />
        <!-- 패널 — 앱 컬럼 안의 풀높이 우측 슬라이드. X 는 translate 유틸 미사용이라 transform 단독 트랜지션 안전 -->
        <section
          class="notif-panel fixed inset-y-0 inset-x-0 w-full max-w-md mx-auto flex flex-col shadow-2xl"
          style="background: var(--color-apjek-surface)"
          data-testid="notifications-panel"
        >
          <header
            class="flex items-center justify-between px-5 pb-3 border-b border-black/5 shrink-0"
            style="padding-top: calc(1rem + env(safe-area-inset-top, 0px))"
          >
            <h3 class="font-bold text-[17px] text-apjek-text flex items-center gap-2">
              <span aria-hidden="true">🔔</span>알림
            </h3>
            <button
              type="button"
              class="size-11 -m-[6px] flex items-center justify-center"
              aria-label="닫기"
              data-testid="notifications-close"
              @click="emit('close')"
            >
              <span class="size-8 rounded-full flex items-center justify-center" style="background: var(--color-apjek-blue-soft)">
                <Icon name="lucide:x" class="w-4 h-4" style="color: var(--color-apjek-blue)" />
              </span>
            </button>
          </header>

          <div class="flex-1 min-h-0 overflow-y-auto px-5" style="padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px))">
            <p v-if="loading" class="py-10 text-center text-xs text-apjek-text-faint">불러오는 중…</p>
            <!-- 실패를 빈 상태("알림이 없어요")로 위장하지 않는다 — 조용하되 구분 표시 -->
            <p v-else-if="failed" class="py-10 text-center text-xs text-apjek-text-faint">알림을 불러오지 못했어요</p>
            <p v-else-if="items.length === 0" class="py-10 text-center text-xs text-apjek-text-faint">알림이 없어요</p>
            <ul v-else class="flex flex-col">
              <li v-for="n in items" :key="n.id" class="border-b border-black/5 last:border-b-0">
                <!-- route 가 있으면 탭 가능한 행(이동), 없으면 정적 행 — 모양은 동일 -->
                <component
                  :is="n.route ? 'button' : 'div'"
                  :type="n.route ? 'button' : undefined"
                  class="w-full text-left py-4"
                  :class="n.route ? 'active:bg-black/[0.03] transition-colors' : ''"
                  :data-testid="`notification-row-${n.id}`"
                  @click="onRowClick(n)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <!-- 미읽음(readAt=null) 강조 — 마젠타 점. 목록은 읽음 처리 전 스냅샷이라
                         이번 오픈에는 강조가 보이고 다음 오픈부터 읽음 표시가 된다. -->
                    <p class="text-sm font-bold text-apjek-text min-w-0 leading-snug">
                      <span v-if="isUnread(n)" class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5" style="background: #FF2BA7" />{{ n.title }}
                    </p>
                    <span class="text-[11px] shrink-0 text-apjek-text-faint pt-0.5">{{ relativeTime(n.createdAt) }}</span>
                  </div>
                  <p class="text-xs mt-1 text-apjek-text-sub leading-relaxed">{{ n.body }}</p>
                </component>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { NotificationResponse, PagedNotificationResponse } from '@terraworld-it/openapi-frontend'

const props = defineProps<{
  /** 패널 표시 여부 — 상태는 부모가 소유. 닫기 요청은 close emit 로만 전달. */
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
    // 백엔드 미구현(404)/네트워크 실패 — 홈이 깨지면 안 되므로 패널 내 안내만 (토스트 없음)
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

function isUnread(n: NotificationResponse): boolean {
  return !n.readAt
}

// 알림 탭 — 서버가 준 앱 내 경로(route, 예: HABIT → /record)로 이동. 패널을 먼저 닫아 라우트 이동 뒤
// 오버레이/back-stack handler 가 남지 않게 한다. 외부 URL 은 딥링크 계약 밖이라 받지 않는다(앱 내 경로만).
function onRowClick(n: NotificationResponse): void {
  const route = n.route
  if (!route || !route.startsWith('/')) return
  emit('close')
  void navigateTo(route)
}

// 상대시간 — Figma 표기("1분전"/"3시간전"/"2일전") 그대로. 미래/비정상 시각은 "방금 전".
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
/* 우측 슬라이드인 — 백드롭 페이드 + 패널 translateX (0.28s). 루트 Transition 의 duration 이
   자식보다 짧으면 Vue 가 종료를 먼저 판정해 잘리므로 루트(opacity)도 0.28s 로 맞춘다. */
.notif-panel-enter-active,
.notif-panel-leave-active { transition: opacity 0.28s ease; }
.notif-panel-enter-active .notif-backdrop,
.notif-panel-leave-active .notif-backdrop { transition: opacity 0.28s ease; }
.notif-panel-enter-active .notif-panel,
.notif-panel-leave-active .notif-panel { transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1); }
.notif-panel-enter-from .notif-backdrop,
.notif-panel-leave-to .notif-backdrop { opacity: 0; }
.notif-panel-enter-from .notif-panel,
.notif-panel-leave-to .notif-panel { transform: translateX(100%); }

/* 앱 컬럼과 뷰포트 폭이 같은 화면에서는 패널 박스를 이동시키지 않고 페이드한다. */
@media (max-width: 448px) {
  .notif-panel-enter-active .notif-panel,
  .notif-panel-leave-active .notif-panel { transition: opacity 0.28s ease; }
  .notif-panel-enter-from .notif-panel,
  .notif-panel-leave-to .notif-panel { transform: none; opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .notif-panel-enter-active,
  .notif-panel-leave-active,
  .notif-panel-enter-active .notif-backdrop,
  .notif-panel-leave-active .notif-backdrop,
  .notif-panel-enter-active .notif-panel,
  .notif-panel-leave-active .notif-panel { transition-duration: 0.01ms; }
}
</style>
