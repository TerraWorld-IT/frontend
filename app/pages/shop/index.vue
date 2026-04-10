<template>
  <div class="riso-grain min-h-screen space-y-5 pb-4">
    <ClientOnly>
      <Suspense>
        <ShopContent />
        <template #fallback>
          <ShopSkeleton />
        </template>
      </Suspense>
      <template #fallback>
        <ShopSkeleton />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
