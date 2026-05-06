<!--
  Modal/Section — 본인 커스텀 카테고리 CRUD.
  /profile 또는 /admin 에 임베드 사용. 최대 10개.
-->
<template>
  <section class="bg-riso-cream rounded-xl p-4 riso-shadow">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-riso-dark">커스텀 카테고리</h3>
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
          삭제
        </button>
      </li>
    </ul>
    <p v-else class="text-sm text-riso-dark/50 mb-3">아직 커스텀 카테고리가 없습니다</p>

    <form v-if="mine.length < 10" class="space-y-2" @submit.prevent="onCreate">
      <div class="grid grid-cols-2 gap-2">
        <input
          v-model="form.name"
          type="text"
          placeholder="이름 (예: 명상)"
          maxlength="20"
          required
          class="px-2 py-1 text-sm border border-riso-dark/20 rounded"
        >
        <input
          v-model="form.tokenName"
          type="text"
          placeholder="토큰 이름 (예: 명상토큰)"
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
          aria-label="색상"
        >
        <input
          v-model="form.emoji"
          type="text"
          placeholder="이모지 (선택)"
          maxlength="2"
          class="w-20 px-2 py-1 text-sm border border-riso-dark/20 rounded"
        >
        <button
          type="submit"
          :disabled="loading"
          class="ml-auto px-3 py-1 text-sm bg-riso-sage text-white rounded disabled:opacity-60"
        >
          {{ loading ? '생성 중...' : '추가' }}
        </button>
      </div>
      <p v-if="errorMsg" class="text-xs text-riso-poppy">{{ errorMsg }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { CategoryResponse } from '@terraworld-it/openapi-frontend'

const { listMine, create, remove, loading, error } = useCustomCategory()
const toast = useToast()
const mine = ref<CategoryResponse[]>([])
const errorMsg = computed(() => error.value)

const form = reactive({
  name: '',
  tokenName: '',
  color: '#A8D8EA',
  emoji: '',
})

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
    toast.success(`'${result.name}' 카테고리가 생성되었습니다`)
    form.name = ''
    form.tokenName = ''
    form.emoji = ''
    await refresh()
  }
}

async function onDelete(id: number) {
  if (!window.confirm('이 카테고리를 삭제하시겠습니까?')) return
  if (await remove(id)) {
    toast.success('카테고리가 삭제되었습니다')
    await refresh()
  }
}

onMounted(() => {
  void refresh()
})
</script>
