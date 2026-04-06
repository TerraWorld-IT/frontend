<template>
  <div class="min-h-screen bg-riso-cream text-riso-dark">
    <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-riso-pink/20">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold">
          TerraWorld
        </NuxtLink>
        <div class="flex items-center gap-2">
          <!-- WalletBar placeholder -->
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 pb-20">
      <slot />
    </main>

    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-riso-pink/20">
      <div class="max-w-lg mx-auto flex justify-around py-2">
        <NuxtLink to="/" class="flex flex-col items-center gap-1 text-xs">
          <span>홈</span>
        </NuxtLink>
        <NuxtLink to="/record" class="flex flex-col items-center gap-1 text-xs">
          <span>기록</span>
        </NuxtLink>
        <NuxtLink to="/terrarium" class="flex flex-col items-center gap-1 text-xs">
          <span>테라리움</span>
        </NuxtLink>
        <NuxtLink to="/shop" class="flex flex-col items-center gap-1 text-xs">
          <span>상점</span>
        </NuxtLink>
        <NuxtLink to="/profile" class="flex flex-col items-center gap-1 text-xs">
          <span>프로필</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
