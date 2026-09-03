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
        class="flex-1 px-5 py-4 overflow-y-auto"
        :class="route.path === '/grow' ? 'bg-apjek-bg' : 'bg-white'"
        :style="{
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(98px + env(safe-area-inset-bottom, 0px))',
          overflowY: route.path === '/shop' ? 'visible' : undefined,
        }"
      >
        <slot />
      </main>

      <!-- Bottom nav — 아프젝 리디자인: 화이트 바 + 상단 헤어라인 보더, lucide 아웃라인 아이콘.
           safe-area-inset-bottom: viewport-fit=cover 라 콘텐츠가 세이프에어리어까지
           확장되는데, 이게 없으면 아이폰 홈 인디케이터가 네비게이션 위에 겹친다. -->
      <nav
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-apjek-surface border-t border-apjek-border z-40"
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
            :class="[
              tab.center
                ? 'flex flex-col gap-[2px] items-center justify-center overflow-hidden shrink-0'
                : 'flex flex-1 flex-col gap-[2px] items-center justify-center min-w-0 overflow-hidden',
              isActive(tab.to) ? 'text-apjek-text' : 'text-apjek-text-faint',
              'h-11 transition-colors',
            ]"
            :style="tab.center ? { width: '74.6px' } : {}"
            @click="onTabTap"
          >
            <!-- 동적 :name 바인딩은 @nuxt/icon scan 이 못 잡으므로
                 nuxt.config.ts icon.clientBundle.icons 에 5종 전부 명시 등록돼 있다. -->
            <Icon :name="tab.iconName" :class="tab.center ? 'w-6 h-6' : 'w-5 h-5'" />
            <span class="text-[10px] tracking-[-0.25px] whitespace-nowrap">
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
const route = useRoute()
useHead(() => ({
  title: 'TERRAWORLD',
  htmlAttrs: {
    'data-safe-area-surface': route.path === '/grow' ? 'grow' : 'surface',
  },
}))

interface Tab {
  to: string
  iconName: string
  label: string
  center?: boolean
}

const { t } = useI18n()

// 아프젝 리디자인 — 탭 순서/라우트는 TERRAWORLD2 이관본 유지, 아이콘은 Figma 디자인과
// 유사한 lucide 아웃라인으로 정렬 (기록하기=펜툴, 키우기=반짝이, 나의테라=새싹,
// 상점=쇼핑백, 더보기=점3개). 활성=진한 텍스트, 비활성=회색 — 색은 링크 class 에서 결정.
const tabs = computed<Tab[]>(() => [
  { to: '/record', iconName: 'lucide:pen-tool', label: t('nav.record') },
  { to: '/grow', iconName: 'lucide:sparkles', label: t('nav.grow') },
  { to: '/', iconName: 'lucide:sprout', label: t('nav.terrarium'), center: true },
  { to: '/shop', iconName: 'lucide:shopping-bag', label: t('nav.shop') },
  { to: '/profile', iconName: 'lucide:ellipsis', label: t('nav.profile') },
])

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

// TW2 Root.tsx BG_COLORS 6키 맵. tabs(5탭)에 없는 라우트(/calendar)도 커버.
// 아프젝 리디자인: 탭별 파스텔 배경을 화이트/연회색 단일 서피스로 통일 — 상수와 키는
// 참조처 보존을 위해 유지, 값만 교체. var() 참조라 다크모드 CSS 변수 보정을 그대로 따른다.
const BG_COLORS: Record<string, string> = {
  '/record': 'var(--color-apjek-surface)',
  '/grow': 'var(--color-apjek-surface)',
  '/': 'var(--color-apjek-surface)',
  '/shop': 'var(--color-apjek-surface)',
  '/profile': 'var(--color-apjek-surface)',
  '/calendar': 'var(--color-apjek-surface)',
}

const currentBgColor = computed<string>(() => BG_COLORS[route.path] ?? 'var(--color-apjek-surface)')
</script>
