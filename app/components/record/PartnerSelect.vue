<!--
  Joint Record — 친구와 함께 기록 시 partner 선택.
  현재는 수락된 invite 의 상대 user-id 를 manual 입력. 추후 friend list API 추가 시 검색 UI 로 확장.
-->
<template>
  <div class="space-y-1">
    <label class="text-xs text-riso-dark/70 flex items-center gap-2">
      <input
        v-model="enabled"
        type="checkbox"
        class="rounded"
      >
      친구와 함께 기록
    </label>
    <input
      v-if="enabled"
      v-model="partnerUserId"
      type="text"
      placeholder="친구 user id (8자 코드 수락 후 표시)"
      class="w-full px-2 py-1 text-sm border border-riso-dark/20 rounded"
      @input="emitChange"
    >
  </div>
</template>

<script setup lang="ts">
const enabled = ref(false)
const partnerUserId = ref('')

const emit = defineEmits<{
  change: [value: string | null]
}>()

watch(enabled, (val) => {
  if (!val) {
    partnerUserId.value = ''
    emit('change', null)
  }
})

function emitChange() {
  emit('change', partnerUserId.value.trim() || null)
}
</script>
