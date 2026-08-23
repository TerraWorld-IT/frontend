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

// 날짜는 recordedDate(YYYY-MM-DD, KST 기준 날짜 문자열) 를 그대로 쓰고 시각은 createdAt 에서 뽑는다.
// `new Date('YYYY-MM-DD')` 는 UTC 자정으로 해석돼 KST 에서 "09:00" 으로 보이는 함정이 있다.
const formattedDate = computed<string>(() => {
  const created = props.record.createdAt ? new Date(props.record.createdAt) : null
  const createdOk = !!created && !Number.isNaN(created.getTime())
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(props.record.recordedDate ?? '')
  let datePart: string
  if (dateOnly) {
    datePart = (props.record.recordedDate as string).replace(/-/g, '.')
  } else if (createdOk) {
    datePart = `${created!.getFullYear()}.${String(created!.getMonth() + 1).padStart(2, '0')}.${String(created!.getDate()).padStart(2, '0')}`
  } else {
    return props.record.recordedDate || props.record.createdAt || ''
  }
  if (!createdOk) return datePart
  const hh = String(created!.getHours()).padStart(2, '0')
  const mi = String(created!.getMinutes()).padStart(2, '0')
  return `${datePart} ${hh}:${mi}`
})
</script>
