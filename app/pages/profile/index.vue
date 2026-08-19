<template>
  <div class="flex flex-col gap-[20px] pb-4">
    <CommonLoading v-if="pending" variant="skeleton" container-class="py-8" />

    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">{{ $t('common.loadFail') }}</p>
      <!-- raw error.message 는 사용자에게 노출하지 않는다 (audit C4-3) — curated 문구로 대체 -->
      <p class="text-xs text-apjek-text-sub">{{ $t('common.loadFailDesc') }}</p>
      <button class="mt-2 px-4 py-2 rounded-full bg-apjek-cta text-white text-sm" @click="load">
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else>
      <!-- 헤더 -->
      <div class="py-[10px]">
        <h1 class="font-bold text-[29px] text-apjek-text tracking-[-0.9px] leading-[28px]">더보기</h1>
      </div>

      <!-- 공지사항 — 아프젝 블랙 필 배너 (공지 API 결정 대기 — 스텁 토스트 유지) -->
      <button
        type="button"
        class="w-full rounded-full bg-apjek-cta text-white flex items-center justify-between px-[16px] py-[13px] transition-all active:scale-[0.98]"
        @click="toast.info('공지사항 기능은 준비중입니다 🚀')"
      >
        <div class="flex items-center gap-[12px]">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <g clip-path="url(#clip_notice)">
              <path :d="P.info.circle" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M8 10.6667V8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M8 5.33333H8.00667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
            </g>
            <defs><clipPath id="clip_notice"><rect fill="white" width="16" height="16" /></clipPath></defs>
          </svg>
          <span class="text-[14px] font-semibold tracking-[-0.15px]">공지사항</span>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="opacity-70">
          <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
        </svg>
      </button>

      <!-- 알림 (스텁 유지) -->
      <button
        type="button"
        class="w-full bg-apjek-surface rounded-[12px] flex items-center justify-between p-[13px] transition-all active:scale-[0.98] border border-apjek-border"
        @click="toast.info('알림 기능은 준비중입니다 🚀')"
      >
        <div class="flex items-center gap-[12px] text-apjek-text">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <g clip-path="url(#clip_alarm)">
              <path :d="P.info.circle" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M8 10.6667V8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M8 5.33333H8.00667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
            </g>
            <defs><clipPath id="clip_alarm"><rect fill="white" width="16" height="16" /></clipPath></defs>
          </svg>
          <span class="text-[14px] font-semibold tracking-[-0.15px]">알림</span>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="text-apjek-text-faint">
          <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
        </svg>
      </button>

      <!-- 나의 프로필 -->
      <div class="apjek-card w-full">
        <div class="p-[21px] flex flex-col gap-[20px]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[8px] text-apjek-text">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <g clip-path="url(#clip_user_p)">
                  <path :d="P.user.circle" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                  <path :d="P.user.head" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                  <path :d="P.user.body" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                </g>
                <defs><clipPath id="clip_user_p"><rect fill="white" width="20" height="20" /></clipPath></defs>
              </svg>
              <span class="apjek-section-title text-[18px] leading-[27px]">나의 프로필</span>
            </div>
            <!-- M2: 닉네임 수정 바텀시트 오픈 -->
            <button
              type="button"
              class="rounded-full bg-apjek-bg flex items-center gap-[4px] px-[12px] py-[6px] transition-all active:scale-95"
              @click="openNicknameSheet"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              <span class="text-[12px] font-semibold text-apjek-text">수정</span>
            </button>
          </div>

          <!-- 프로필 정보 -->
          <div class="flex items-center gap-[16px]">
            <div
              class="size-[64px] rounded-full flex items-center justify-center text-[30px] shrink-0"
              style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)"
            >
              🌍
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-[18px] text-apjek-text tracking-[-0.44px] leading-[28px] truncate">{{ nickname }}</p>
              <p class="text-[12px] text-apjek-text-faint leading-[16px]">TERRAWORLD 유저</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 친구목록 -->
      <div class="apjek-card w-full">
        <div class="p-[21px] flex flex-col gap-[20px]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[8px] text-apjek-text">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <g clip-path="url(#clip_user_f)">
                  <path :d="P.user.circle" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                  <path :d="P.user.head" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                  <path :d="P.user.body" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                </g>
                <defs><clipPath id="clip_user_f"><rect fill="white" width="20" height="20" /></clipPath></defs>
              </svg>
              <span class="apjek-section-title text-[18px] leading-[27px]">친구목록</span>
            </div>
            <!-- 우측 "나의 초대코드" 링크 → /friends -->
            <NuxtLink to="/friends" class="flex items-center gap-[2px] text-apjek-text">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              <span class="text-[12px] font-semibold">나의 초대코드</span>
            </NuxtLink>
          </div>

          <!-- 친구 행 + 놀러가기 → /friends -->
          <NuxtLink
            to="/friends"
            class="w-full rounded-[12px] flex items-center gap-[12px] p-[12px] bg-apjek-bg"
          >
            <div
              class="size-[36px] rounded-full flex items-center justify-center text-[18px] shrink-0"
              style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)"
            >
              🌍
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[14px] font-semibold text-apjek-text leading-[20px] tracking-[-0.15px]">친구 관리</p>
              <p class="text-[10px] text-apjek-text-faint leading-[15px] tracking-[0.117px]">초대 코드 발급 · 입력</p>
            </div>
            <span class="shrink-0 rounded-full bg-apjek-cta text-white text-[12px] font-semibold px-[12px] py-[6px] whitespace-nowrap">놀러가기</span>
          </NuxtLink>
        </div>
      </div>

      <!-- 보유 재화 -->
      <div class="apjek-card w-full">
        <div class="p-[21px] flex flex-col gap-[20px]">
          <div class="flex items-center gap-[8px] text-apjek-text">
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path :d="P.star" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
            </svg>
            <span class="apjek-section-title text-[18px] leading-[27px]">보유 재화</span>
          </div>

          <!-- 재화 환전 — 다크 필 버튼 → /shop 환전 진입 -->
          <NuxtLink to="/shop" class="apjek-cta w-full">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path :d="P.exchange.up" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M13.3333 4.66667H2.66667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path :d="P.exchange.down" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              <path d="M2.66667 11.3333H13.3333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
            </svg>
            재화 환전
          </NuxtLink>

          <!-- 토큰 4종 (상단 행) -->
          <div class="grid grid-cols-4 gap-[8px]">
            <div
              v-for="tkn in tokenCells"
              :key="tkn.code"
              class="rounded-[12px] flex flex-col items-center p-[13px] gap-[4px] bg-apjek-bg"
            >
              <div class="flex items-center justify-center h-5">
                <IconsCurrencyIcon :code="tkn.code" :size="18" />
              </div>
              <span class="text-[11px] text-apjek-text-sub text-center">{{ tkn.label }}</span>
              <span class="text-[12px] font-semibold text-apjek-text text-center">{{ formatBalance(balanceOf(user?.currency, tkn.code)) }}</span>
            </div>
          </div>

          <!-- 코인 · 반짝이 · 루비 (하단 행) -->
          <div class="grid grid-cols-3 gap-[8px]">
            <div
              v-for="c in coinCells"
              :key="c.code"
              class="rounded-[12px] flex flex-col items-center p-[16px] gap-[4px] bg-apjek-bg"
            >
              <div class="flex items-center justify-center h-5">
                <IconsCurrencyIcon :code="c.code" :size="20" />
              </div>
              <span class="text-[12px] font-semibold text-apjek-text-sub text-center">{{ c.label }}</span>
              <span class="text-[14px] font-bold text-apjek-text text-center tracking-[-0.15px]">{{ formatBalance(balanceOf(user?.currency, c.code)) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 도감 -->
      <div class="apjek-card w-full">
        <div class="p-[21px] flex flex-col gap-[20px]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[8px] text-apjek-text">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path :d="P.star" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              </svg>
              <span class="apjek-section-title text-[18px] leading-[27px]">도감</span>
            </div>
            <button type="button" class="flex items-center gap-[4px] text-apjek-text active:scale-95 transition-all" @click="showItemsDialog = true">
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path :d="P.eye.outer" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                <path :d="P.eye.inner" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
              </svg>
              <span class="text-[14px] font-semibold tracking-[-0.15px]">자세히보기</span>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-[16px]">
            <div class="rounded-[12px] flex flex-col items-start p-[16px] h-[92px] bg-apjek-bg">
              <span class="text-[30px] font-bold text-apjek-text tracking-[0.4px] leading-[36px]">{{ ownedCount }}</span>
              <span class="text-[14px] font-semibold text-apjek-text-sub tracking-[-0.15px] mt-[4px]">보유 중</span>
            </div>
            <div class="rounded-[12px] flex flex-col items-start p-[16px] h-[92px] bg-apjek-bg">
              <span class="text-[30px] font-bold text-apjek-text tracking-[0.4px] leading-[36px]">{{ placedCount }}</span>
              <span class="text-[14px] font-semibold text-apjek-text-sub tracking-[-0.15px] mt-[4px]">배치됨</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 월간 랭킹 (계정과 무관 — 단독 진입 행, 기존 동선 유지) -->
      <NuxtLink
        to="/ranking"
        class="w-full bg-apjek-surface rounded-[12px] flex items-center justify-between p-[13px] transition-all active:scale-[0.98] border border-apjek-border"
      >
        <div class="flex items-center gap-[12px] text-apjek-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
          <span class="text-[14px] font-semibold tracking-[-0.15px]">{{ $t('profile.menuRanking') }}</span>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="text-apjek-text-faint"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
      </NuxtLink>

      <!-- 계정 -->
      <div class="apjek-card w-full">
        <div class="p-[21px] flex flex-col gap-[16px]">
          <div class="flex items-center gap-[8px] text-apjek-text">
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <g clip-path="url(#clip_user_a)">
                <path :d="P.user.circle" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                <path :d="P.user.head" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
                <path :d="P.user.body" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.66667" />
              </g>
              <defs><clipPath id="clip_user_a"><rect fill="white" width="20" height="20" /></clipPath></defs>
            </svg>
            <span class="apjek-section-title text-[18px] leading-[27px]">{{ $t('profile.accountSection') }}</span>
          </div>

          <div class="flex flex-col gap-[8px]">
            <!-- 이용 안내 (준비 중 토스트) -->
            <button
              type="button"
              class="w-full bg-apjek-surface rounded-[12px] flex items-center justify-between p-[13px] text-left transition-all active:scale-[0.98] border border-apjek-border"
              @click="toast.info(t('profile.menuGuideComingSoon'))"
            >
              <div class="flex items-center gap-[12px] text-apjek-text">
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <g clip-path="url(#clip_guide)">
                    <path :d="P.info.circle" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                    <path d="M8 10.6667V8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                    <path d="M8 5.33333H8.00667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                  </g>
                  <defs><clipPath id="clip_guide"><rect fill="white" width="16" height="16" /></clipPath></defs>
                </svg>
                <span class="text-[14px] font-semibold tracking-[-0.15px]">{{ $t('profile.menuGuide') }}</span>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="text-apjek-text-faint"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
            </button>

            <!-- 설정 (계정 · 동의 항목 관리 — /profile/settings 서브페이지, 기존 동선 유지) -->
            <NuxtLink
              to="/profile/settings"
              class="w-full bg-apjek-surface rounded-[12px] flex items-center justify-between p-[13px] transition-all active:scale-[0.98] border border-apjek-border"
            >
              <div class="flex items-center gap-[12px] text-apjek-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                <div class="flex flex-col items-start">
                  <span class="text-[14px] font-semibold tracking-[-0.15px]">설정</span>
                  <span class="text-[10px] text-apjek-text-faint leading-[15px] tracking-[0.117px]">계정 · 동의 항목 관리</span>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="text-apjek-text-faint"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
            </NuxtLink>

            <!-- 로그아웃 -->
            <button
              type="button"
              class="w-full bg-apjek-surface rounded-[12px] flex items-center justify-between p-[13px] text-left transition-all active:scale-[0.98] border border-apjek-border"
              :disabled="loggingOut"
              @click="onLogout"
            >
              <div class="flex items-center gap-[12px] text-apjek-text">
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path :d="P.logout.door" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                  <path :d="P.logout.arrow" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                  <path d="M14 8H6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                </svg>
                <span class="text-[14px] font-semibold tracking-[-0.15px]">{{ loggingOut ? $t('profile.loggingOut') : $t('profile.logout') }}</span>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="text-apjek-text-faint"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 보유 아이템 다이얼로그 -->
      <Transition name="fade">
        <div v-if="showItemsDialog" class="fixed inset-0 bg-black/50 z-50" @click="showItemsDialog = false" />
      </Transition>
      <Transition name="dialog">
        <div
          v-if="showItemsDialog"
          ref="itemsDialogRoot"
          class="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto max-h-[80dvh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="보유 아이템"
        >
          <div class="bg-white rounded-[16px] p-6 flex flex-col max-h-[80dvh] border border-apjek-border">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-[18px] text-apjek-text">보유 아이템</h3>
              <button type="button" class="text-gray-400 hover:text-gray-600" :aria-label="$t('common.close')" @click="showItemsDialog = false">✕</button>
            </div>
            <div class="overflow-y-auto flex-1">
              <div v-if="ownedItems.length === 0" class="text-center py-8 text-gray-400">
                <div class="text-4xl mb-2">🛒</div>
                <p class="text-sm">보유한 아이템이 없습니다</p>
              </div>
              <div v-else class="grid grid-cols-3 gap-3">
                <div
                  v-for="itemId in ownedItems"
                  :key="itemId"
                  class="rounded-[12px] flex flex-col items-center justify-center gap-1 p-3 text-center bg-apjek-bg border border-apjek-border"
                >
                  <div class="text-3xl">📦</div>
                  <span class="text-[11px] font-semibold text-gray-700 truncate w-full">{{ itemId }}</span>
                  <span v-if="isPlaced(itemId)" class="text-[9px] text-[#7edbc0] font-semibold">배치됨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- M2: 닉네임 수정 바텀시트 — focus trap / 스크롤 잠금 / 뒤로가기는 CommonBottomSheet 내장 -->
      <CommonBottomSheet
        :open="showNicknameSheet"
        ariaLabel="프로필 수정"
        :expandable="false"
        @close="showNicknameSheet = false"
      >
        <div class="px-5 pt-1 flex flex-col gap-[16px]">
          <h3 class="font-bold text-[18px] text-apjek-text tracking-[-0.44px]">프로필 수정</h3>
          <div class="flex flex-col gap-[8px]">
            <label for="nickname-input" class="text-[13px] font-semibold text-apjek-text-sub">닉네임</label>
            <input
              id="nickname-input"
              v-model="nicknameDraft"
              type="text"
              maxlength="20"
              placeholder="닉네임을 입력해주세요"
              class="w-full h-[48px] px-[16px] rounded-[12px] border border-apjek-border-strong bg-apjek-surface text-[15px] text-apjek-text focus:outline-none focus:border-apjek-blue"
              @keyup.enter="saveNickname"
            >
            <div class="flex items-center justify-between min-h-[16px]">
              <p v-if="!nicknameValid" class="text-[12px] text-riso-poppy">닉네임은 1~20자로 입력해주세요</p>
              <span v-else class="text-[12px] text-transparent select-none">&nbsp;</span>
              <span class="text-[12px] text-apjek-text-faint">{{ nicknameDraft.trim().length }}/20</span>
            </div>
          </div>
          <button
            type="button"
            class="apjek-cta w-full h-[48px]"
            :disabled="!nicknameValid || nicknameSaving"
            @click="saveNickname"
          >
            {{ nicknameSaving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </CommonBottomSheet>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { UserMeResponse } from '@terraworld-it/openapi-frontend'
// `useUserStore` 는 auto-import 가 걸리지 않는다 (frontend/CLAUDE.md § 함정) — 명시 import.
import { useUserStore } from '~/stores/user'
import { balanceOf, type CurrencyCode } from '~/utils/currency'

definePageMeta({ layout: 'default', middleware: 'auth' })

const userStore = useUserStore()
const toast = useToast()
const { t } = useI18n()
const { sdk, client } = useOpenApi()

const pending = ref<boolean>(true)
const fetchError = ref<Error | null>(null)
// 프로필은 스토어의 TTL 캐시(15초) 뷰를 그대로 읽는다 — 탭 왕복마다 getMe 를 다시 치지 않는다.
const user = computed<UserMeResponse | null>(() => userStore.me as UserMeResponse | null)
const showItemsDialog = ref<boolean>(false)

// bespoke 오버레이 role="dialog" aria-modal="true" 에 실제 focus trap 부여(Codex Round 3 지적).
const itemsDialogRoot = ref<HTMLElement | null>(null)
useDialogFocusTrap(itemsDialogRoot, showItemsDialog, () => { showItemsDialog.value = false })

// Android 하드웨어 뒤로가기 — bespoke 오버레이라 직접 back-stack 에 등록.
const { pushBackHandler } = useBackButtonStack()
let unregisterItemsDialogBackHandler: (() => void) | null = null
watch(showItemsDialog, (open) => {
  if (open) {
    unregisterItemsDialogBackHandler = pushBackHandler(() => { showItemsDialog.value = false })
  } else {
    unregisterItemsDialogBackHandler?.()
    unregisterItemsDialogBackHandler = null
  }
})
onBeforeUnmount(() => {
  unregisterItemsDialogBackHandler?.()
  unregisterItemsDialogBackHandler = null
})

const nickname = computed<string>(() => user.value?.nickname ?? 'TERRA유저')
const ownedItems = computed<string[]>(() => user.value?.ownedItems ?? [])
const ownedCount = computed<number>(() => user.value?.ownedItems?.length ?? 0)
const placedCount = computed<number>(() => user.value?.placedItems?.length ?? 0)

function isPlaced(slug: string): boolean {
  // ownedItems 는 slug(string), placedItems[].itemId 는 number → itemSlug 로 매칭.
  return (user.value?.placedItems ?? []).some(p => p.itemSlug === slug)
}

// ── M2: 프로필(닉네임) 수정 ─────────────────────────────────────────────
const showNicknameSheet = ref<boolean>(false)
const nicknameDraft = ref<string>('')
const nicknameSaving = ref<boolean>(false)
// spec 계약: PUT /users/me body.nickname 1~20자 (openapi UpdateMeRequest). maxlength=20 이
// raw 길이를 캡하므로 trim 후 1자 이상만 추가 검증하면 된다.
const nicknameValid = computed<boolean>(() => {
  const len = nicknameDraft.value.trim().length
  return len >= 1 && len <= 20
})

function openNicknameSheet() {
  // 현재 닉네임 프리필 — 시트를 다시 열 때마다 최신 값으로 초기화.
  nicknameDraft.value = user.value?.nickname ?? ''
  showNicknameSheet.value = true
}

async function saveNickname() {
  if (!nicknameValid.value || nicknameSaving.value) return
  nicknameSaving.value = true
  try {
    const { error } = await sdk.updateMe({ client, body: { nickname: nicknameDraft.value.trim() } })
    // 백엔드 미구현 구간(실서버 404 가능) 안전 처리 — raw 에러는 노출하지 않는다.
    if (error) {
      toast.error('잠시 후 다시 시도해주세요')
      return
    }
    showNicknameSheet.value = false
    toast.success('닉네임을 변경했어요')
    // 응답이 유저 전체 스냅샷이지만 스토어에 전체 setter 가 없어 강제 재조회로 갱신.
    // 갱신 실패는 표시 지연일 뿐 수정 자체는 성공이므로 에러로 승격하지 않는다.
    await userStore.fetchMe(true).catch(() => {})
  }
  catch {
    toast.error('잠시 후 다시 시도해주세요')
  }
  finally {
    nicknameSaving.value = false
  }
}

// ── 계정: 로그아웃 (settings.vue 와 동일 동선) ──────────────────────────
const loggingOut = ref<boolean>(false)

async function onLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    const { signOutAndClear } = useAuth()
    await signOutAndClear()
    toast.success(t('profile.loggedOut'))
    await navigateTo('/auth/login')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    loggingOut.value = false
  }
}

// TW2 svgPaths 인라인 (src/imports/MainContent/svg-4ycpuggk5k, Container-3, ContainerMargin).
const P = {
  info: { circle: 'M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z' },
  user: {
    circle: 'M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z',
    head: 'M10 10.8333C11.3807 10.8333 12.5 9.71405 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.71405 8.61929 10.8333 10 10.8333Z',
    body: 'M5.83333 17.2183V15.8333C5.83333 15.3913 6.00893 14.9674 6.32149 14.6548C6.63405 14.3423 7.05797 14.1667 7.5 14.1667H12.5C12.942 14.1667 13.366 14.3423 13.6785 14.6548C13.9911 14.9674 14.1667 15.3913 14.1667 15.8333V17.2183',
  },
  star: 'M9.60417 1.9125C9.64069 1.83872 9.6971 1.77661 9.76704 1.73319C9.83699 1.68977 9.91767 1.66676 10 1.66676C10.0823 1.66676 10.163 1.68977 10.233 1.73319C10.3029 1.77661 10.3593 1.83872 10.3958 1.9125L12.3208 5.81167C12.4476 6.06831 12.6348 6.29034 12.8664 6.45871C13.0979 6.62708 13.3668 6.73676 13.65 6.77833L17.955 7.40833C18.0366 7.42015 18.1132 7.45456 18.1762 7.50767C18.2393 7.56077 18.2862 7.63046 18.3117 7.70884C18.3372 7.78722 18.3402 7.87117 18.3205 7.9512C18.3008 8.03122 18.259 8.10413 18.2 8.16167L15.0867 11.1933C14.8813 11.3934 14.7277 11.6404 14.639 11.913C14.5503 12.1856 14.5292 12.4757 14.5775 12.7583L15.3125 17.0417C15.3269 17.1232 15.3181 17.2071 15.2871 17.2839C15.2561 17.3607 15.2041 17.4272 15.1371 17.4758C15.0701 17.5245 14.9908 17.5533 14.9082 17.5591C14.8256 17.5648 14.7431 17.5472 14.67 17.5083L10.8217 15.485C10.5681 15.3519 10.286 15.2823 9.99958 15.2823C9.71318 15.2823 9.43107 15.3519 9.1775 15.485L5.33 17.5083C5.25694 17.547 5.1745 17.5644 5.09204 17.5585C5.00959 17.5527 4.93043 17.5238 4.86358 17.4752C4.79673 17.4266 4.74486 17.3602 4.71388 17.2835C4.6829 17.2069 4.67405 17.1231 4.68833 17.0417L5.4225 12.7592C5.471 12.4764 5.44999 12.1862 5.36128 11.9134C5.27258 11.6406 5.11884 11.3935 4.91333 11.1933L1.8 8.1625C1.7405 8.10503 1.69833 8.032 1.6783 7.95173C1.65828 7.87146 1.6612 7.78718 1.68673 7.70849C1.71227 7.6298 1.75939 7.55987 1.82273 7.50665C1.88607 7.45344 1.96309 7.41908 2.045 7.4075L6.34917 6.77833C6.63271 6.73708 6.90199 6.62755 7.13382 6.45916C7.36565 6.29076 7.55309 6.06856 7.68 5.81167L9.60417 1.9125Z',
  exchange: {
    up: 'M10.6667 2L13.3333 4.66667L10.6667 7.33333',
    down: 'M5.33333 14L2.66667 11.3333L5.33333 8.66667',
  },
  eye: {
    outer: 'M1.37467 7.768C1.31911 7.91768 1.31911 8.08232 1.37467 8.232C1.9158 9.5441 2.83434 10.666 4.01385 11.4554C5.19335 12.2448 6.5807 12.6663 8 12.6663C9.4193 12.6663 10.8066 12.2448 11.9862 11.4554C13.1657 10.666 14.0842 9.5441 14.6253 8.232C14.6809 8.08232 14.6809 7.91768 14.6253 7.768C14.0842 6.4559 13.1657 5.33403 11.9862 4.5446C10.8066 3.75517 9.4193 3.33374 8 3.33374C6.5807 3.33374 5.19335 3.75517 4.01385 4.5446C2.83434 5.33403 1.9158 6.4559 1.37467 7.768Z',
    inner: 'M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z',
  },
  logout: {
    door: 'M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6',
    arrow: 'M10.6667 11.3333L14 8L10.6667 4.66667',
  },
}

// 보유재화 셀 — 아이콘은 IconsCurrencyIcon(TW2 Figma path 정확 이관) 컴포넌트로 렌더.
const coinCells: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'COIN', label: '코인' },
  { code: 'SPARKLE', label: '반짝이' },
  { code: 'RUBY', label: '루비' },
]

const tokenCells: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'DEW', label: '이슬' },
  { code: 'SUN', label: '햇살' },
  { code: 'BOLT', label: '번개' },
  { code: 'WIND', label: '바람' },
]

// balances.amount 는 정수 계약 — 다른 화면과 통일해 정수로 표시.
function formatBalance(amount: number): string {
  return Math.floor(amount).toLocaleString()
}

// 동의 항목 관리 로직은 /profile/settings 로 이전 (2026-07-21). 로그아웃은 아프젝 리디자인
// §계정 카드로 재진입 (settings 페이지의 동일 기능은 유지 — 두 동선 모두 signOutAndClear 경유).

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    // 스토어가 TTL 캐시(15초) + in-flight dedup 을 소유한다. 실패 시 스스로 throw.
    await userStore.fetchMe()
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
  finally {
    pending.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: translateY(20px) translateY(-50%) scale(0.95);
}
</style>
