<template>
  <div class="min-h-screen bg-riso-cream text-riso-dark riso-grain">
    <header class="sticky top-0 z-50 bg-riso-cream/85 backdrop-blur-md border-b border-riso-walnut/8">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold tracking-tight">
          🌿 TerraWorld
        </NuxtLink>
        <CommonWalletBar :coin="128" />
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 pb-24">
      <slot />
    </main>

    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-t border-riso-walnut/8">
      <div class="max-w-lg mx-auto flex justify-around items-center h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl transition-colors text-riso-dark/40 hover:text-riso-sage"
          active-class="!text-riso-sage"
        >
          <span class="text-xl">{{ tab.icon }}</span>
          <span class="text-[10px] font-medium">{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Global Toast -->
    <CommonToast />
  </div>
</template>

<script setup lang="ts">
const tabs = [
  { to: '/', icon: '🏠', label: '홈' },
  { to: '/record', icon: '📝', label: '기록' },
  { to: '/terrarium', icon: '🫧', label: '테라리움' },
  { to: '/shop', icon: '🏪', label: '상점' },
  { to: '/profile', icon: '👤', label: '프로필' },
]
</script>
