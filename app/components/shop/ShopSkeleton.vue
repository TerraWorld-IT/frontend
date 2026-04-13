<template>
  <div class="riso-grain min-h-screen space-y-5 pb-4 animate-pulse">
    <!-- Header skeleton -->
    <div>
      <div class="h-6 w-32 bg-riso-walnut/10 rounded-lg mb-2" />
      <div class="h-4 w-52 bg-riso-walnut/8 rounded-lg" />
    </div>

    <!-- Currency area skeleton -->
    <div class="py-4 space-y-3">
      <div class="h-9 w-20 bg-riso-walnut/10 rounded-xl" />
      <!-- Coin rows -->
      <div class="flex items-center gap-3 p-3 rounded-2xl bg-riso-walnut/5">
        <div class="w-8 h-8 rounded-full bg-riso-walnut/15" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-16 bg-riso-walnut/10 rounded" />
          <div class="h-5 w-12 bg-riso-walnut/15 rounded" />
        </div>
      </div>
      <div class="flex items-center gap-3 p-3 rounded-2xl bg-riso-walnut/5">
        <div class="w-8 h-8 rounded-full bg-riso-walnut/15" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-20 bg-riso-walnut/10 rounded" />
          <div class="h-5 w-10 bg-riso-walnut/15 rounded" />
        </div>
      </div>
    </div>

    <!-- Shop type toggle skeleton -->
    <div class="flex gap-2">
      <div class="flex-1 h-10 rounded-xl bg-riso-walnut/15" />
      <div class="flex-1 h-10 rounded-xl bg-riso-walnut/8" />
    </div>

    <!-- Filter tabs skeleton -->
    <div class="flex gap-1.5 overflow-hidden pb-1">
      <div v-for="i in 5" :key="i" class="shrink-0 h-7 rounded-full bg-riso-walnut/10" :class="i === 1 ? 'w-16' : 'w-12'" />
    </div>

    <!-- Item grid skeleton (6 cards) -->
    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-white/60 rounded-[16px] border border-black/5 p-3 flex flex-col aspect-square"
      >
        <div class="h-3 w-3/4 bg-riso-walnut/10 rounded mb-2 mx-auto" />
        <div class="flex-1 flex items-center justify-center">
          <div class="w-14 h-14 rounded-xl bg-riso-walnut/10" />
        </div>
        <div class="space-y-1.5 mt-2">
          <div class="h-4 w-12 bg-riso-walnut/8 rounded-full mx-auto" />
          <div class="h-7 w-full bg-riso-walnut/10 rounded-full" />
        </div>
      </div>
    </div>
  </div>
</template>
