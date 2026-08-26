<!--
  테라리움 해금 팝업 + 해금 성공 팝업 (아프젝 T14 — Figma "해금 팝업 Lv.2/Lv.3", "해금 성공 Lv.2/Lv.3").
  - 해금 팝업: 헤더 "Lv.N 테라리움 해금하기" + X, 병 일러스트(플레이스홀더) + 검정 원형 "SET" 정령 뱃지(정령 있는
    레벨만), 설명 "… 테라리움 입니다. / 배치 가능한 아이템 : N개", CTA 3상태:
      [젬 아이콘 루비 N개로 해금하기](검정) / 비활성 "루비 N개 사용 | 루비가 부족합니다" / 비활성 "이전 레벨을 먼저 해금해 주세요"
  - 성공 팝업: "해금 성공! {정령} 정령을 획득했어요. / 새로운 테라리움을 관리해 보세요" (정령 없으면 "해금 성공! / …")
    + 연파랑 [✏️ 관리 모드 바로가기]. 해금해도 표시 병은 바뀌지 않는다(댓글 #46) — 바로가기를 누르면
    부모가 해금한 병으로 전환 후 관리 모드로 들어가고, X 로 닫으면 현재 병이 유지된다.
  실 해금 호출(useTier.unlock)은 부모가 소유 — unlock/manage emit 만 한다.
  등록명: TerrariumTierUnlockModal.
-->
<template>
  <!-- 해금 팝업 -->
  <TerrariumHomeDialog
    :open="open && !success"
    :title="target ? `Lv.${target.level} 테라리움 해금하기` : '테라리움 해금하기'"
    aria-label="테라리움 해금하기"
    @close="emit('close')"
  >
    <div v-if="target" class="flex flex-col items-center" data-testid="tier-unlock-body">
      <!-- 해금 병 일러스트 — 디자이너 "테라리움해금2/3"(Lv.3 은 SET 정령 뱃지가 이미지에 포함) -->
      <img
        :src="unlockArtSrc(target.level)"
        alt=""
        width="240"
        height="240"
        class="w-[240px] h-[240px] object-contain mb-3 select-none"
        aria-hidden="true"
        draggable="false"
      >
      <p class="text-sm text-apjek-text text-center leading-relaxed">{{ target.descriptionKo }}</p>
      <p class="text-sm text-apjek-text-sub text-center mb-5">배치 가능한 아이템 : {{ target.slots }}개</p>

      <!-- CTA 3상태 -->
      <button
        v-if="!target.prevUnlocked"
        type="button"
        class="apjek-cta w-full py-3"
        disabled
        data-testid="tier-unlock-cta"
      >이전 레벨을 먼저 해금해 주세요</button>
      <button
        v-else-if="rubyBalance < target.rubyCost"
        type="button"
        class="apjek-cta w-full py-3"
        disabled
        data-testid="tier-unlock-cta"
      ><Icon name="lucide:gem" class="w-4 h-4" aria-hidden="true" />루비 {{ target.rubyCost }}개 사용 | 루비가 부족합니다</button>
      <button
        v-else
        type="button"
        class="apjek-cta w-full py-3"
        :disabled="busy"
        data-testid="tier-unlock-cta"
        @click="emit('unlock', target)"
      ><Icon v-if="!busy" name="lucide:gem" class="w-4 h-4" aria-hidden="true" />{{ busy ? '해금 중…' : `루비 ${target.rubyCost}개로 해금하기` }}</button>
    </div>
  </TerrariumHomeDialog>

  <!-- 해금 성공 팝업 -->
  <TerrariumHomeDialog
    :open="open && !!success"
    title="해금 성공!"
    icon="🎉"
    aria-label="해금 성공"
    @close="emit('close')"
  >
    <div v-if="success" class="flex flex-col items-center" data-testid="tier-unlock-success">
      <img
        :src="unlockArtSrc(success.level)"
        alt=""
        width="240"
        height="240"
        class="w-[240px] h-[240px] object-contain mb-3 select-none"
        aria-hidden="true"
        draggable="false"
      >
      <p class="text-sm font-semibold text-apjek-text text-center leading-relaxed">
        {{ success.grantedSpirit ? `해금 성공! ${spiritNameKo(success.grantedSpirit)} 정령을 획득했어요.` : '해금 성공!' }}
      </p>
      <p class="text-sm text-apjek-text-sub text-center mb-5">새로운 테라리움을 관리해 보세요</p>
      <button
        type="button"
        class="w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
        style="background: var(--color-apjek-blue-soft); color: var(--color-apjek-blue-deep)"
        data-testid="tier-unlock-manage"
        @click="emit('manage')"
      >✏️ 관리 모드 바로가기</button>
    </div>
  </TerrariumHomeDialog>
</template>

<script setup lang="ts">
import type { JarLevel } from '~/utils/tierLevels'

/** 해금 성공 결과 — 부모가 unlockTier 응답에서 추린다 */
export interface TierUnlockSuccess {
  level: number
  /** 해금된 티어 코드 — [관리 모드 바로가기] 가 이 병으로 전환한다 */
  tier: string
  grantedSpirit: string | null
}

const props = defineProps<{
  open: boolean
  /** 해금 대상 레벨(없으면 본문 비움) */
  target: JarLevel | null
  /** 현재 루비 잔액 — 부족 판정 */
  rubyBalance: number
  /** 해금 호출 진행 중 */
  busy: boolean
  /** 성공 결과 — 있으면 성공 팝업으로 전환 */
  success: TierUnlockSuccess | null
}>()

const emit = defineEmits<{ close: [], unlock: [level: JarLevel], manage: [] }>()

/** 해금 일러스트 — Lv.2 / Lv.3 두 장(Lv.1 은 기본 병이라 해금 대상이 아님). */
function unlockArtSrc(level: number): string {
  return level >= 3 ? '/illust/unlock-lv3.webp' : '/illust/unlock-lv2.webp'
}
</script>
