<template>
  <div class="py-6 space-y-5">
    <div>
      <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
      <h1 class="text-xl font-bold text-riso-dark mt-1">카테고리 보상 관리</h1>
    </div>

    <CommonLoading v-if="loading" />

    <div v-else class="space-y-3">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 space-y-3"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" :style="{ backgroundColor: cat.color + '22' }">
            {{ cat.emoji ?? '🏷️' }}
          </div>
          <div class="flex-1">
            <p class="font-bold text-sm text-riso-dark">{{ cat.name }}</p>
            <p class="text-[10px] text-riso-dark/40">토큰: {{ cat.tokenName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="bg-riso-cream/50 rounded-xl p-2.5 text-center">
            <p class="text-[10px] text-riso-dark/40">코인 보상</p>
            <p class="font-bold text-sm text-riso-dark">{{ cat.baseCoinReward }}</p>
          </div>
          <div class="bg-riso-cream/50 rounded-xl p-2.5 text-center">
            <p class="text-[10px] text-riso-dark/40">토큰 보상</p>
            <p class="font-bold text-sm text-riso-dark">{{ cat.baseTokenReward }}</p>
          </div>
          <div class="bg-riso-cream/50 rounded-xl p-2.5 text-center">
            <p class="text-[10px] text-riso-dark/40">일일 한도</p>
            <p class="font-bold text-sm text-riso-dark">{{ cat.dailyLimit ?? '∞' }}</p>
          </div>
        </div>
      </div>

      <p v-if="categories.length === 0" class="text-center text-sm text-riso-dark/30 py-8">
        카테고리 없음
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryResponse } from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const { sdk, client } = useOpenApi()
const loading = ref(true)
const categories = ref<CategoryResponse[]>([])

onMounted(async () => {
  const { data, error } = await sdk.listCategories({ client })
  if (!error && data) categories.value = castData<import('@terraworld-it/openapi-frontend').CategoryListResponse>(data)?.categories ?? []
  loading.value = false
})
</script>
