<template>
  <div class="min-h-screen bg-neutral-100 flex items-center justify-center">
    <!-- Mobile app frame, centered on desktop (TERRAWORLD2 Root.tsx 정확 이관) -->
    <div
      class="w-full max-w-md min-h-screen shadow-2xl relative flex flex-col transition-colors duration-300"
      :style="{ backgroundColor: currentBgColor }"
    >
      <!-- Main content -->
      <main
        ref="mainScrollEl"
        class="flex-1 px-5 py-4 overflow-y-auto bg-white"
        :style="{
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(98px + env(safe-area-inset-bottom, 0px))',
        }"
      >
        <slot />
      </main>

      <!-- Bottom nav (Figma BottomNav 정확 이관).
           safe-area-inset-bottom: viewport-fit=cover 라 콘텐츠가 세이프에어리어까지
           확장되는데, 이게 없으면 아이폰 홈 인디케이터가 네비게이션 위에 겹친다. -->
      <nav
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white shadow-[0_-1px_0_rgba(0,0,0,0.06)] z-40"
        :style="{
          height: 'calc(98px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }"
      >
        <div class="absolute left-[10px] right-[10px] top-[20px] h-[38px] flex items-center">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            :class="tab.center
              ? 'flex flex-col gap-[2px] items-center justify-center overflow-hidden shrink-0'
              : 'flex flex-1 flex-col gap-[2px] items-center justify-center min-w-0 overflow-hidden'"
            :style="tab.center ? { width: '74.6px' } : {}"
            @click="onTabTap"
          >
            <!-- 기록하기 -->
            <svg v-if="tab.icon === 'record'" width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path d="M13.0892 17.7442C12.9329 17.9004 12.721 17.9882 12.5 17.9882C12.279 17.9882 12.0671 17.9004 11.9108 17.7442L10.5892 16.4225C10.4329 16.2662 10.3452 16.0543 10.3452 15.8333C10.3452 15.6124 10.4329 15.4004 10.5892 15.2442L15.2442 10.5892C15.4004 10.4329 15.6124 10.3452 15.8333 10.3452C16.0543 10.3452 16.2662 10.4329 16.4225 10.5892L17.7442 11.9108C17.9004 12.0671 17.9882 12.279 17.9882 12.5C17.9882 12.721 17.9004 12.9329 17.7442 13.0892L13.0892 17.7442Z" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path d="M15 10.8333L13.8542 5.105C13.823 4.94915 13.7479 4.80546 13.6378 4.69088C13.5276 4.57631 13.387 4.49562 13.2325 4.45833L2.69583 1.69C2.55702 1.65644 2.41192 1.65911 2.27444 1.69777C2.13696 1.73642 2.01172 1.80976 1.91074 1.91074C1.80976 2.01172 1.73642 2.13696 1.69777 2.27444C1.65911 2.41192 1.65644 2.55702 1.69 2.69583L4.45833 13.2325C4.49562 13.387 4.57631 13.5276 4.69088 13.6378C4.80546 13.7479 4.94915 13.823 5.105 13.8542L10.8333 15" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path d="M1.91667 1.91667L7.98833 7.98833" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path d="M9.16667 10.8333C10.0871 10.8333 10.8333 10.0871 10.8333 9.16667C10.8333 8.24619 10.0871 7.5 9.16667 7.5C8.24619 7.5 7.5 8.24619 7.5 9.16667C7.5 10.0871 8.24619 10.8333 9.16667 10.8333Z" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
            </svg>

            <!-- 키우기 -->
            <svg v-else-if="tab.icon === 'grow'" width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path d="M8.28083 12.9167C8.20643 12.6283 8.05611 12.3651 7.84551 12.1545C7.63491 11.9439 7.37173 11.7936 7.08333 11.7192L1.97083 10.4008C1.88361 10.3761 1.80684 10.3235 1.75218 10.2512C1.69751 10.1789 1.66794 10.0907 1.66794 10C1.66794 9.90933 1.69751 9.82113 1.75218 9.7488C1.80684 9.67646 1.88361 9.62392 1.97083 9.59917L7.08333 8.28C7.37162 8.20567 7.63474 8.05548 7.84533 7.84503C8.05593 7.63459 8.2063 7.37157 8.28083 7.08333L9.59917 1.97083C9.62367 1.88326 9.67615 1.80612 9.7486 1.75116C9.82105 1.69621 9.90948 1.66646 10.0004 1.66646C10.0913 1.66646 10.1798 1.69621 10.2522 1.75116C10.3247 1.80612 10.3772 1.88326 10.4017 1.97083L11.7192 7.08333C11.7936 7.37173 11.9439 7.63491 12.1545 7.84551C12.3651 8.05612 12.6283 8.20644 12.9167 8.28083L18.0292 9.59833C18.1171 9.62258 18.1946 9.67501 18.2499 9.74756C18.3051 9.82012 18.335 9.9088 18.335 10C18.335 10.0912 18.3051 10.1799 18.2499 10.2524C18.1946 10.325 18.1171 10.3774 18.0292 10.4017L12.9167 11.7192C12.6283 11.7936 12.3651 11.9439 12.1545 12.1545C11.9439 12.3651 11.7936 12.6283 11.7192 12.9167L10.4008 18.0292C10.3763 18.1167 10.3238 18.1939 10.2514 18.2488C10.179 18.3038 10.0905 18.3335 9.99958 18.3335C9.90865 18.3335 9.82021 18.3038 9.74777 18.2488C9.67532 18.1939 9.62284 18.1167 9.59833 18.0292L8.28083 12.9167Z" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M16.6667 2.5V5.83333" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M18.3333 4.16667H15" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M3.33333 14.1667V15.8333" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M4.16667 15H2.5" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
            </svg>

            <!-- 나의테라 (center) -->
            <svg v-else-if="tab.icon === 'myterra'" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M7 20H17" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              <path d="M10 20C15.5 17.5 10.8 13.6 13 10" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              <path d="M9.5 9.4C10.6 10.2 11.3 11.6 11.8 13.1C9.8 13.5 8.3 13.5 7 12.8C5.8 12.2 4.7 10.9 4 8.6C6.8 8.1 8.4 8.6 9.5 9.4Z" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              <path d="M14.1 6C13.3376 7.19156 12.9541 8.58615 13 10C14.9 9.9 16.3 9.4 17.3 8.6C18.3 7.6 18.9 6.3 19 4C16.3 4.1 15 5 14.1 6Z" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            </svg>

            <!-- 상점 -->
            <svg v-else-if="tab.icon === 'shop'" width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path d="M5 1.66667L2.5 5V16.6667C2.5 17.1087 2.67559 17.5326 2.98816 17.8452C3.30072 18.1577 3.72464 18.3333 4.16667 18.3333H15.8333C16.2754 18.3333 16.6993 18.1577 17.0118 17.8452C17.3244 17.5326 17.5 17.1087 17.5 16.6667V5L15 1.66667H5Z" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path d="M2.5 5H17.5" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              <path d="M13.3333 8.33333C13.3333 9.21739 12.9821 10.0652 12.357 10.6904C11.7319 11.3155 10.8841 11.6667 10 11.6667C9.11595 11.6667 8.2681 11.3155 7.64298 10.6904C7.01786 10.0652 6.66667 9.21739 6.66667 8.33333" :stroke="iconColor(tab)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
            </svg>

            <!-- 더보기 -->
            <svg v-else width="20" height="20" fill="none" viewBox="0 0 20 20">
              <circle cx="4" cy="10" r="1.5" :fill="iconColor(tab)" />
              <circle cx="10" cy="10" r="1.5" :fill="iconColor(tab)" />
              <circle cx="16" cy="10" r="1.5" :fill="iconColor(tab)" />
            </svg>

            <span class="text-[10px] tracking-[-0.25px] whitespace-nowrap" :style="{ color: isActive(tab.to) ? '#121212' : '#AEAEAE' }">
              {{ tab.label }}
            </span>
          </NuxtLink>
        </div>
      </nav>
    </div>

    <!-- AdSense PC banner (hidden on mobile container width) -->
    <CommonAdSenseBanner />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'TERRAWORLD' })

interface Tab {
  to: string
  icon: 'record' | 'grow' | 'myterra' | 'shop' | 'more'
  label: string
  bgColor: string
  inactive: string
  center?: boolean
}

const { t } = useI18n()

// TERRAWORLD2 Root.tsx NAV_ITEMS + BG_COLORS 정확 이관 (순서/라우트/색).
const tabs = computed<Tab[]>(() => [
  { to: '/record', icon: 'record', label: t('nav.record'), bgColor: '#fffbf0', inactive: '#AEAEAE' },
  { to: '/grow', icon: 'grow', label: t('nav.grow'), bgColor: '#f0fff4', inactive: '#AEAEAE' },
  { to: '/', icon: 'myterra', label: t('nav.terrarium'), bgColor: '#f0fff4', inactive: '#B8B8B8', center: true },
  { to: '/shop', icon: 'shop', label: t('nav.shop'), bgColor: '#fff5f5', inactive: '#AEAEAE' },
  { to: '/profile', icon: 'more', label: t('nav.profile'), bgColor: '#faf5ff', inactive: '#A1A1A1' },
])

const route = useRoute()
const { hapticImpact } = useNative()
const mainScrollEl = ref<HTMLElement | null>(null)

// 모든 페이지가 이 <main> 하나를 공유하는 단일 스크롤 컨테이너라, 탭 전환 시 이전 페이지의
// 스크롤 위치가 그대로 남아 새 탭이 중간부터 보이는 것처럼 보일 수 있었다(Codex 감사 지적).
// 탭별 위치 기억 대신 "탭 전환 시 항상 맨 위로" 정책으로 명시(대부분의 앱의 기본 기대 동작).
function onTabTap(): void {
  void hapticImpact('Light')
  mainScrollEl.value?.scrollTo({ top: 0 })
}

// TW2: '/' 는 정확 일치, 그 외는 startsWith.
function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

function iconColor(tab: Tab): string {
  return isActive(tab.to) ? '#121212' : tab.inactive
}

// TW2 Root.tsx BG_COLORS 6키 맵. tabs(5탭)에 없는 라우트(/calendar)도 커버.
const BG_COLORS: Record<string, string> = {
  '/record': '#fffbf0',
  '/grow': '#f0fff4',
  '/': '#f0fff4',
  '/shop': '#fff5f5',
  '/profile': '#faf5ff',
  '/calendar': '#f0fbff',
}

const currentBgColor = computed<string>(() => BG_COLORS[route.path] ?? '#ffffff')
</script>
