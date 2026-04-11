<template>
  <div class="min-h-screen bg-neutral-100 flex items-center justify-center riso-grain">
    <!-- Mobile app container, centered on desktop -->
    <div
      class="relative flex flex-col w-full max-w-md min-h-screen shadow-2xl transition-colors duration-300"
      :style="{ backgroundColor: currentBgColor }"
    >
      <!-- Main content -->
      <main class="flex-1 px-5 py-4 pb-28 overflow-y-auto bg-white">
        <div class="max-w-2xl mx-auto">
          <slot />
        </div>
      </main>

      <!-- Bottom nav (fixed within container) -->
      <nav class="absolute bottom-0 left-0 right-0 bg-white/85 backdrop-blur-sm border-t border-black/5">
        <div class="px-4 py-3 bg-[#59575733] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div class="flex items-end justify-around">
            <NuxtLink
              v-for="tab in tabs"
              :key="tab.to"
              :to="tab.to"
              class="flex flex-col items-center gap-1 transition-all"
              @click="onTabTap"
            >
              <div
                class="flex items-center justify-center rounded-2xl transition-all"
                :class="[
                  tab.center ? 'w-14 h-14 rounded-full shadow-lg' : 'w-12 h-12',
                  isActive(tab.to)
                    ? (tab.center ? 'shadow-lg' : 'shadow-lg scale-105')
                    : 'bg-neutral-100 hover:bg-neutral-200',
                ]"
                :style="activeStyle(tab)"
              >
                <Icon
                  :name="tab.icon"
                  :class="[
                    tab.center ? 'w-6 h-6' : 'w-5 h-5',
                    isActive(tab.to) ? 'text-white' : 'text-black',
                  ]"
                />
              </div>
              <span
                class="text-xs font-medium transition-colors"
                :class="isActive(tab.to) && tab.center ? 'text-black' : 'text-neutral-400'"
              >
                {{ tab.label }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </nav>
    </div>

    <!-- Global Toast -->
    <CommonToast />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'TERRAWORLD' })

interface Tab {
  to: string
  icon: string
  label: string
  color: string
  bgColor: string
  center?: boolean
}

// Tabs ported from Figma0409 Root.tsx (order + colors + labels)
const tabs: Tab[] = [
  { to: '/record', icon: 'lucide:pen-tool', label: '기록', color: '#f092f0', bgColor: '#fffbf0' },
  { to: '/calendar', icon: 'lucide:calendar', label: '캘린더', color: '#97a8f1', bgColor: '#f0fbff' },
  { to: '/', icon: 'lucide:sprout', label: '나의테라', color: '#7edbc0', bgColor: '#f0fff4', center: true },
  { to: '/shop', icon: 'lucide:shopping-bag', label: '상점', color: '#fcee5a', bgColor: '#fff5f5' },
  { to: '/profile', icon: 'lucide:user', label: '서랍', color: '#eb662c', bgColor: '#faf5ff' },
]

const route = useRoute()
const { hapticImpact } = useNative()

function onTabTap() { hapticImpact('Light') }

function isActive(to: string): boolean {
  return route.path === to
}

function activeStyle(tab: Tab): Record<string, string> {
  if (!isActive(tab.to)) {
    return tab.center ? { backgroundColor: '#f5f5f5' } : {}
  }
  return { backgroundColor: tab.color }
}

const currentBgColor = computed(() => {
  const match = tabs.find((t) => t.to === route.path)
  return match?.bgColor ?? '#ffffff'
})
</script>
