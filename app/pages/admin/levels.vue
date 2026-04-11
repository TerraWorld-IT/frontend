<template>
  <div class="py-6 space-y-5">
    <div>
      <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
      <h1 class="text-xl font-bold text-riso-dark mt-1">레벨 설정</h1>
    </div>

    <CommonLoading v-if="loading" />

    <div v-else class="space-y-2">
      <div
        v-for="level in levels"
        :key="level.level"
        class="bg-white rounded-2xl p-4 border border-riso-walnut/10 flex items-center gap-4"
      >
        <div class="w-10 h-10 rounded-full bg-riso-sage/15 flex items-center justify-center font-bold text-riso-sage">
          {{ level.level }}
        </div>
        <div class="flex-1">
          <p class="font-medium text-sm text-riso-dark">레벨 {{ level.level }}</p>
          <p class="text-[10px] text-riso-dark/40">필요 EXP: {{ level.requiredExp }}</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-riso-dark/50">최대 슬롯</p>
          <p class="font-bold text-riso-dark">{{ level.maxSlots }}</p>
        </div>
      </div>

      <p v-if="levels.length === 0" class="text-center text-sm text-riso-dark/30 py-8">
        레벨 설정 없음
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })

const { sdk, client } = useOpenApi()
const loading = ref(true)
const levels = ref<Array<{ level: number; requiredExp: number; maxSlots: number }>>([])

onMounted(async () => {
  const { data, error } = await sdk.getLevels({ client })
  if (!error && data) levels.value = (data as { levels: typeof levels.value }).levels ?? []
  loading.value = false
})
</script>
