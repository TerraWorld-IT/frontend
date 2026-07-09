<template>
  <div class="bg-white rounded-[16px] border border-black/10 p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-[12px] flex items-center justify-center text-xl"
          style="background-color: #f1c3f4"
        >
          {{ displayIcon }}
        </div>
        <div>
          <div class="font-semibold text-sm text-black">{{ displayLabel }}</div>
          <div class="text-xs text-[#525252]">{{ formattedDate }}</div>
        </div>
      </div>
      <div v-if="record.duration" class="text-sm font-semibold text-[#525252]">
        {{ $t('record.durationMin', { n: record.duration }) }}
      </div>
    </div>
    <div v-if="record.memo" class="mt-3 text-sm text-[#525252] pl-[60px]">
      {{ record.memo }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RecordResponse } from '@terraworld-it/openapi-frontend'
import { recordDisplayIcon, recordDisplayLabel } from '~/utils/constants'

const props = defineProps<{
  record: RecordResponse
}>()

// dailyType 이 있는 기록은 보상 토큰 라우팅용 canonical 카테고리(categoryName)가 실제
// 기록 종류와 다를 수 있어(예: DIARY → "독서" 카테고리) dailyType 라벨을 우선 표시한다.
const displayLabel = computed<string>(() => recordDisplayLabel(props.record))
const displayIcon = computed<string>(() => recordDisplayIcon(props.record))

const formattedDate = computed<string>(() => {
  const src = props.record.recordedDate || props.record.createdAt
  const d = new Date(src)
  if (Number.isNaN(d.getTime())) return src
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`
})
</script>
