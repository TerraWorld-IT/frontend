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

    <!-- Create dialog -->
    <CommonModal :model-value="showCreateDialog" @update:model-value="closeCreate">
      <form class="space-y-3" @submit.prevent="submitCreate">
        <h3 class="font-bold text-lg text-riso-dark">{{ $t('admin.items.createTitle') }}</h3>

        <label class="block">
          <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldName') }}</span>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="100"
            class="mt-1 w-full h-10 px-3 rounded-xl border border-riso-walnut/20 text-sm bg-white"
          >
        </label>

        <label class="block">
          <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldAsset') }}</span>
          <input
            v-model="form.assetUrl"
            type="text"
            required
            maxlength="500"
            placeholder="🌵"
            class="mt-1 w-full h-10 px-3 rounded-xl border border-riso-walnut/20 text-sm bg-white"
          >
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldPriceType') }}</span>
            <select v-model="form.priceType" class="mt-1 w-full h-10 px-2 rounded-xl border border-riso-walnut/20 text-sm bg-white">
              <option v-for="opt in priceTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldPriceAmount') }}</span>
            <input
              v-model.number="form.priceAmount"
              type="number"
              min="0"
              required
              class="mt-1 w-full h-10 px-3 rounded-xl border border-riso-walnut/20 text-sm bg-white"
            >
          </label>
        </div>

        <label v-if="form.priceType === 'MIXED'" class="block">
          <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldTokenPrice') }}</span>
          <input
            v-model.number="form.tokenPrice"
            type="number"
            min="0"
            class="mt-1 w-full h-10 px-3 rounded-xl border border-riso-walnut/20 text-sm bg-white"
          >
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldRarity') }}</span>
            <select v-model="form.rarity" class="mt-1 w-full h-10 px-2 rounded-xl border border-riso-walnut/20 text-sm bg-white">
              <option v-for="opt in rarityOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldLayout') }}</span>
            <select v-model="form.layout" class="mt-1 w-full h-10 px-2 rounded-xl border border-riso-walnut/20 text-sm bg-white">
              <option v-for="opt in layoutOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
        </div>

        <label class="block">
          <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldCategory') }}</span>
          <select v-model="form.categoryId" class="mt-1 w-full h-10 px-2 rounded-xl border border-riso-walnut/20 text-sm bg-white">
            <option :value="null">{{ $t('admin.items.categoryNone') }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-riso-dark/50">{{ $t('admin.items.fieldDescription') }}</span>
          <input
            v-model="form.description"
            type="text"
            class="mt-1 w-full h-10 px-3 rounded-xl border border-riso-walnut/20 text-sm bg-white"
          >
        </label>

        <button
          type="submit"
          :disabled="creating"
          class="w-full h-11 rounded-full bg-riso-navy text-white font-medium text-sm disabled:opacity-40"
        >
          {{ creating ? $t('admin.items.submitting') : $t('admin.items.submit') }}
        </button>
      </form>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
import type {
  AdminItemCreateRequest,
  CategoryListResponse,
  CategoryResponse,
  ItemResponse,
} from '@terraworld-it/openapi-frontend'
import { useItemsStore } from '~/stores/items'

interface ItemRow {
  item: ItemResponse
  // ItemResponse 에 active 필드가 없어 로컬 상태로 추적 (기본 활성)
  active: boolean
}

definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const itemsStore = useItemsStore()
const { sdk, client } = useOpenApi()
const { t } = useI18n()
const toast = useToast()

const loading = ref<boolean>(true)
const showCreateDialog = ref<boolean>(false)
const toggling = ref<number | null>(null)
const creating = ref<boolean>(false)
const rows = ref<ItemRow[]>([])
const categories = ref<CategoryResponse[]>([])

const priceTypeOptions: AdminItemCreateRequest['priceType'][] = ['BASIC', 'SPECIAL', 'MIXED', 'TOKEN']
const rarityOptions: NonNullable<AdminItemCreateRequest['rarity']>[] = ['COMMON', 'RARE', 'EPIC']
const layoutOptions: NonNullable<AdminItemCreateRequest['layout']>[] = ['FOREGROUND', 'BACKGROUND', 'FIGURE']

function emptyForm(): AdminItemCreateRequest {
  return {
    name: '',
    assetUrl: '',
    priceType: 'BASIC',
    priceAmount: 0,
    tokenPrice: null,
    rarity: 'COMMON',
    layout: 'FOREGROUND',
    categoryId: null,
    description: '',
  }
}

const form = ref<AdminItemCreateRequest>(emptyForm())

async function toggleActive(itemId: number) {
  const row = rows.value.find((r) => r.item.id === itemId)
  if (!row) return
  const next = !row.active
  toggling.value = itemId
  try {
    await sdk.setItemActive({
      client,
      path: { itemId },
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

function closeCreate() {
  showCreateDialog.value = false
  form.value = emptyForm()
}

async function submitCreate() {
  const name = form.value.name.trim()
  const assetUrl = form.value.assetUrl.trim()
  if (!name || !assetUrl || form.value.priceAmount < 0) {
    toast.error(t('admin.items.validation'))
    return
  }
  creating.value = true
  try {
    const { data, error } = await sdk.createItem({
      client,
      body: {
        ...form.value,
        name,
        assetUrl,
        // MIXED 가 아니면 보조 토큰 가격 무의미 — null 정리
        tokenPrice: form.value.priceType === 'MIXED' ? form.value.tokenPrice : null,
        description: form.value.description?.trim() || null,
      },
    })
    if (error) throw error
    const created = castData<ItemResponse>(data)
    if (created) rows.value.unshift({ item: created, active: true })
    toast.success(t('admin.items.created'))
    closeCreate()
  }
  catch {
    toast.error(t('admin.items.createError'))
  }
  finally {
    creating.value = false
  }
}

async function loadCategories() {
  const { data, error } = await sdk.listCategories({ client })
  if (!error && data) {
    categories.value = castData<CategoryListResponse>(data)?.categories ?? []
  }
}

onMounted(async () => {
  await Promise.all([itemsStore.fetchAll(), loadCategories()])
  rows.value = itemsStore.items.map((item) => ({ item, active: true }))
  loading.value = false
})
</script>
