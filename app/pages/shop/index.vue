<template>
  <div class="riso-grain min-h-screen space-y-5 pb-4">
    <Suspense>
      <ShopContent />
      <template #fallback>
        <ShopSkeleton />
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
