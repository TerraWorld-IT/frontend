<template>
  <div class="py-6 space-y-5">
    <div>
      <NuxtLink to="/admin" class="text-xs text-riso-dark/40 hover:text-riso-dark">← Admin</NuxtLink>
      <h1 class="text-xl font-bold text-riso-dark mt-1">교환 비율 관리</h1>
    </div>

    <div class="bg-white rounded-2xl p-5 border border-riso-walnut/10 space-y-4">
      <h3 class="font-bold text-sm text-riso-dark">현재 교환 비율</h3>
      <div class="space-y-3">
        <div class="flex justify-between items-center py-2 border-b border-riso-walnut/5">
          <span class="text-sm text-riso-dark/60">스페셜 코인 → 기본 코인</span>
          <span class="font-bold text-riso-dark">1 : 2</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-riso-walnut/5">
          <span class="text-sm text-riso-dark/60">카테고리 토큰 ↔ 카테고리 토큰</span>
          <span class="font-bold text-riso-dark">1 : 1</span>
        </div>
      </div>
      <p class="text-xs text-riso-dark/30">비율 수정 API는 Phase 2에서 구현 예정</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth', 'admin'] })
</script>
