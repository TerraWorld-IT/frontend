<template>
  <div class="py-6 space-y-5">
    <div class="flex justify-between items-center">
      <div>
        <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
        <h1 class="text-xl font-bold text-riso-dark mt-1">{{ $t('admin.items.title') }}</h1>
      </div>
      <button
        class="bg-riso-sage text-white px-4 py-2 rounded-full text-xs font-medium riso-shadow-sm active:scale-95 transition-transform"
        @click="showCreateDialog = true"
      >
        {{ $t('admin.items.newItem') }}
      </button>
    </div>

    <CommonLoading v-if="loading" />

    <!-- Item list -->
    <div v-else class="space-y-2">
      <div
        v-for="row in rows"
        :key="row.item.id"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 flex items-center gap-3"
      >
        <div class="w-12 h-12 bg-riso-cream rounded-xl flex items-center justify-center text-2xl">
          {{ row.item.assetUrl }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-riso-dark truncate">{{ row.item.name }}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded-full',
                row.item.rarity === 'EPIC' ? 'bg-purple-100 text-purple-600' :
                row.item.rarity === 'RARE' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-500'
              ]"
            >
              {{ row.item.rarity }}
            </span>
            <span class="text-[10px] text-riso-dark/40">{{ row.item.layout }}</span>
            <span class="text-[10px] text-riso-dark/40">{{ row.item.priceAmount }} {{ row.item.priceType }}</span>
          </div>
        </div>
        <button
          :class="[
            'text-[11px] px-2.5 py-1.5 rounded-full font-medium transition-transform active:scale-95 disabled:opacity-40 shrink-0',
            row.active ? 'bg-riso-sage/15 text-riso-sage' : 'bg-gray-100 text-gray-400',
          ]"
          :disabled="toggling === row.item.id"
          @click="toggleActive(row.item.id)"
        >
          {{ toggling === row.item.id
            ? $t('admin.common.saving')
            : row.active ? $t('admin.items.active') : $t('admin.items.inactive') }}
        </button>
      </div>

      <div v-if="rows.length === 0" class="text-center py-12">
        <p class="text-riso-dark/30 text-sm">{{ $t('admin.items.empty') }}</p>
      </div>
    </div>

    <!-- Create dialog placeholder -->
    <CommonModal :model-value="showCreateDialog" @update:model-value="showCreateDialog = false">
      <div class="space-y-4">
        <h3 class="font-bold text-lg text-riso-dark">{{ $t('admin.items.createTitle') }}</h3>
        <p class="text-sm text-riso-dark/40">{{ $t('admin.items.createNotice') }}</p>
        <button
          class="w-full h-11 rounded-full bg-riso-navy text-white font-medium text-sm"
          @click="showCreateDialog = false"
        >
          {{ $t('common.confirm') }}
        </button>
      </div>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
import type { ItemResponse } from '@terraworld-it/openapi-frontend'
import { useItemsStore } from '~/stores/items'

interface ItemRow {
  item: ItemResponse
  // ItemResponse 에 active 필드가 없어 로컬 상태로 추적 (기본 활성)
  active: boolean
}

definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const itemsStore = useItemsStore()
const { request } = useInternalApi()
const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const showCreateDialog = ref(false)
const toggling = ref<number | null>(null)
const rows = ref<ItemRow[]>([])

async function toggleActive(itemId: number) {
  const row = rows.value.find((r) => r.item.id === itemId)
  if (!row) return
  const next = !row.active
  toggling.value = itemId
  try {
    await request(`/api/v1/admin/items/${itemId}/active`, {
      method: 'PUT',
      body: { active: next },
    })
    row.active = next
    toast.success(next ? t('admin.items.activated') : t('admin.items.deactivated'))
  }
  catch {
    toast.error(t('admin.common.saveError'))
  }
  finally {
    toggling.value = null
  }
}

onMounted(async () => {
  await itemsStore.fetchAll()
  rows.value = itemsStore.items.map((item) => ({ item, active: true }))
  loading.value = false
})
</script>
