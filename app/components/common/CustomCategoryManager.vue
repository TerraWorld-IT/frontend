<!--
  Modal/Section — 본인 커스텀 카테고리 CRUD.
  /profile 또는 /admin 에 임베드 사용. 최대 10개.
-->
<template>
  <section class="bg-riso-cream rounded-xl p-4 riso-shadow">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-riso-dark">{{ $t('category.customCategory') }}</h3>
      <span class="text-xs text-riso-dark/50">{{ mine.length }}/10</span>
    </div>

    <ul v-if="mine.length" class="space-y-1 mb-3">
      <li
        v-for="cat in mine"
        :key="cat.id"
        class="flex items-center gap-2 px-2 py-1 rounded bg-white/50"
      >
        <span class="w-3 h-3 rounded-full" :style="{ background: cat.color }" aria-hidden="true" />
        <span v-if="cat.emoji" class="text-base" aria-hidden="true">{{ cat.emoji }}</span>
        <span class="font-medium text-sm text-riso-dark flex-1">{{ cat.name }}</span>
        <span class="text-xs text-riso-dark/50">{{ cat.tokenName }}</span>
        <button
          type="button"
          class="text-xs text-riso-poppy hover:underline"
          :disabled="loading"
          @click="onDelete(cat.id)"
        >
          {{ $t('common.delete') }}
        </button>
      </li>
    </ul>
    <p v-else class="text-sm text-riso-dark/50 mb-3">{{ $t('category.empty') }}</p>

    <form v-if="mine.length < 10" class="space-y-2" @submit.prevent="onCreate">
      <div class="grid grid-cols-2 gap-2">
        <input
          ref="nameInput"
          v-model="form.name"
          type="text"
          :placeholder="$t('category.namePlaceholder')"
          maxlength="20"
          required
          class="px-2 py-1 text-sm border border-riso-dark/20 rounded"
        >
        <input
          v-model="form.tokenName"
          type="text"
          :placeholder="$t('category.tokenNamePlaceholder')"
          maxlength="20"
          required
          class="px-2 py-1 text-sm border border-riso-dark/20 rounded"
        >
      </div>
      <div class="flex gap-2 items-center">
        <input
          v-model="form.color"
          type="color"
          class="w-10 h-8 rounded cursor-pointer"
          :aria-label="$t('category.colorLabel')"
        >
        <input
          v-model="form.emoji"
          type="text"
          :placeholder="$t('category.emojiPlaceholder')"
          maxlength="2"
          class="w-20 px-2 py-1 text-sm border border-riso-dark/20 rounded"
        >
        <button
          type="submit"
          :disabled="loading"
          class="ml-auto px-3 py-1 text-sm bg-riso-sage text-white rounded disabled:opacity-60"
        >
          {{ loading ? $t('category.creating') : $t('category.add') }}
        </button>
      </div>
      <p v-if="errorMsg" class="text-xs text-riso-poppy">{{ errorMsg }}</p>
    </form>

    <CommonModal
      v-model="showDeleteConfirm"
      :message="t('category.deleteConfirm')"
      variant="danger"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup lang="ts">
import type { CategoryResponse } from '@terraworld-it/openapi-frontend'

const { t } = useI18n()
const { listMine, create, remove, loading, error } = useCustomCategory()
const toast = useToast()
const mine = ref<CategoryResponse[]>([])
const errorMsg = computed<string | null>(() => error.value)

const form = reactive({
  name: '',
  tokenName: '',
  color: '#A8D8EA',
  emoji: '',
})
const nameInput = ref<HTMLInputElement | null>(null)

async function refresh() {
  try {
    mine.value = await listMine()
  } catch {
    // listCategories 자체 오류 — UI 에는 빈 목록 + Manager 의 errorMsg 별도 처리
    mine.value = []
  }
}

async function onCreate() {
  const result = await create({
    name: form.name.trim(),
    tokenName: form.tokenName.trim(),
    color: form.color,
    emoji: form.emoji.trim() || undefined,
  })
  if (result) {
    toast.success(t('category.created', { name: result.name }))
    // 10번째 생성 직후 mine.length >= 10 이 되어 폼 자체(v-if="mine.length < 10")가
    // 사라지는 edge case — 그 전에 키보드 해제 (utils/keyboard.ts 참조, Codex 감사 지적).
    void dismissKeyboard()
    form.name = ''
    form.tokenName = ''
    form.emoji = ''
    await refresh()
  }
  else {
    // useCustomCategory.create() 는 실패 시 error.value 만 세팅하고(errorMsg 로 하단에
    // 텍스트 표시) 조용히 null 반환 — 눈에 잘 띄는 toast 로도 알리고, 가장 흔한 실패
    // 원인(이름 중복 409)인 name 필드로 포커스를 옮겨 사용자가 바로 고칠 수 있게 한다.
    if (errorMsg.value) toast.error(errorMsg.value)
    nameInput.value?.focus()
  }
}

const showDeleteConfirm = ref<boolean>(false)
const pendingDeleteId = ref<number | null>(null)

function onDelete(id: number) {
  pendingDeleteId.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  pendingDeleteId.value = null
  if (id === null) return
  if (await remove(id)) {
    toast.success(t('category.deleted'))
    await refresh()
  }
}

onMounted(() => {
  void refresh()
})
</script>
