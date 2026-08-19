<!--
  홈 아코디언 (아프젝 리디자인 T4) — apjek-card + 헤더 토글 + 셰브론 회전.
  상태는 부모가 소유한다(open prop + update:open emit) — 친구 목록 lazy load 가
  부모의 watch 로 걸려 있어 펼침 상태를 부모 ref 로 유지해야 한다.
  등록명은 폴더 prefix 규칙으로 TerrariumHomeAccordion (.nuxt/components.d.ts 기준).
-->
<template>
  <section class="apjek-card overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center justify-between px-4 py-4"
      :aria-expanded="open"
      @click="emit('update:open', !open)"
    >
      <span class="flex items-center gap-2 min-w-0">
        <Icon :name="icon" class="w-4 h-4 shrink-0 text-apjek-text" />
        <span class="text-[15px] font-bold text-apjek-text tracking-[-0.2px] whitespace-nowrap">{{ title }}</span>
      </span>
      <Icon
        name="lucide:chevron-down"
        class="w-4 h-4 shrink-0 text-apjek-text-sub transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div v-show="open">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// 동적 :name 바인딩은 @nuxt/icon scan 이 못 잡는다 — 아이콘은 반드시
// nuxt.config.ts icon.clientBundle.icons 등재분만 넘길 것 (미등재 시 조용히 빈 아이콘).
defineProps<{
  /** 헤더 타이틀 */
  title: string
  /** lucide 아이콘 이름 — clientBundle 등재분 한정 */
  icon: string
  /** 펼침 상태 — 부모 소유 (v-model:open) */
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>
