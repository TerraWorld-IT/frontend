<template>
  <div class="py-6 space-y-5">
    <div class="flex justify-between items-center">
      <div>
        <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
        <h1 class="text-xl font-bold text-riso-dark mt-1">아이템 관리</h1>
      </div>
      <button
        class="bg-riso-sage text-white px-4 py-2 rounded-full text-xs font-medium riso-shadow-sm active:scale-95 transition-transform"
        @click="showCreateDialog = true"
      >
        + 새 아이템
      </button>
    </div>

    <CommonLoading v-if="loading" />

    <!-- Item list -->
    <div v-else class="space-y-2">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 flex items-center gap-3"
      >
        <div class="w-12 h-12 bg-riso-cream rounded-xl flex items-center justify-center text-2xl">
          {{ item.assetUrl }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-riso-dark truncate">{{ item.name }}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded-full',
                item.rarity === 'EPIC' ? 'bg-purple-100 text-purple-600' :
                item.rarity === 'RARE' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-500'
              ]"
            >
              {{ item.rarity }}
            </span>
            <span class="text-[10px] text-riso-dark/40">{{ item.layout }}</span>
            <span class="text-[10px] text-riso-dark/40">{{ item.priceAmount }} {{ item.priceType }}</span>
          </div>
        </div>
        <div class="text-xs text-riso-dark/30">#{{ item.id }}</div>
      </div>

      <div v-if="items.length === 0" class="text-center py-12">
        <p class="text-riso-dark/30 text-sm">등록된 아이템이 없습니다</p>
      </div>
    </div>

    <!-- Create dialog placeholder -->
    <CommonModal :show="showCreateDialog" @close="showCreateDialog = false">
      <div class="space-y-4">
        <h3 class="font-bold text-lg text-riso-dark">새 아이템 등록</h3>
        <p class="text-sm text-riso-dark/40">아이템 생성 폼은 Phase 2에서 구현 예정입니다.</p>
        <button
          class="w-full h-11 rounded-full bg-riso-navy text-white font-medium text-sm"
          @click="showCreateDialog = false"
        >
          확인
        </button>
      </div>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const itemsStore = useItemsStore()
const loading = ref(true)
const showCreateDialog = ref(false)

const items = computed(() => itemsStore.items.value)

onMounted(async () => {
  await itemsStore.fetchAll()
  loading.value = false
})
</script>
