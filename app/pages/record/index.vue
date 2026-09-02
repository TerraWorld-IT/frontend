<template>
  <div class="min-h-screen space-y-[28px] pb-4" data-testid="record-page">
    <!-- 헤더 — 아프젝: 타이틀 + 우상단 검정 필 [📅 캘린더] (R6b) -->
    <div class="flex items-center justify-between py-[10px]">
      <h1 class="font-bold text-[28px] text-apjek-text tracking-[-0.9px] leading-[32px]">
        기록하기
      </h1>
      <button
        type="button"
        class="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] apjek-cta h-[40px] px-[16px] text-[13px] transition-all active:scale-95"
        @click="goToCalendar()"
      >
        <Icon name="lucide:calendar" class="w-4 h-4" />
        캘린더
      </button>
    </div>

    <!-- ─── 습관 기록 ─── -->
    <div class="space-y-[14px]">
      <div>
        <h2 class="apjek-section-title text-[18px] leading-[28px]">
          습관 기록
        </h2>
        <p class="text-[14px] text-apjek-text-sub tracking-[-0.3px] leading-[20px] mt-[4px]">
          1주일동안 지정한 습관을 실천하고 반짝이를 획득해요
        </p>
      </div>

      <!-- 습관 카드 — 파랑 1px 테두리, 좌측 🌸 타일 + "1주일 연속 기록 / +반짝이".
           카드 본체는 클릭 불가(댓글 #5/#6) — 우측 버튼만 동작: 습관 없음=[✏️ 시작하기](생성 시트),
           있음=^ 접기/펼침 토글 (R6b). -->
      <div
        class="rounded-[16px] border border-apjek-blue bg-apjek-surface p-[16px]"
        data-layout-anchor="record-habit-card"
        :aria-busy="!habitsLoaded"
      >
        <div class="flex items-center gap-[14px]">
          <img
            src="/icons/token/sparkle.png"
            alt=""
            class="size-[56px] shrink-0 select-none"
            aria-hidden="true"
            draggable="false"
          >
          <div class="flex-1 min-w-0">
            <p class="text-[16px] font-bold text-apjek-text tracking-[-0.3px] leading-[22px]">1주일 연속 기록</p>
            <p class="text-[12px] leading-[16px] mt-[2px] text-apjek-sparkle">+반짝이</p>
          </div>
          <!-- 데이터 전에는 카드 셸을 그대로 두고 우측 액션 자리만 예약한다. -->
          <div
            v-if="!habitsLoaded"
            class="size-[34px] shrink-0 rounded-full bg-apjek-border animate-pulse"
            data-testid="record-habit-skeleton"
            role="status"
            aria-live="polite"
            aria-label="습관 불러오는 중"
          >
            <span class="sr-only">습관 불러오는 중</span>
          </div>
          <button
            v-else-if="!hasAnyHabit"
            type="button"
            class="relative after:absolute after:inset-x-0 after:-inset-y-[5px] after:content-[''] h-[34px] px-[12px] rounded-full border border-apjek-border-strong bg-apjek-surface text-[13px] font-semibold text-apjek-text inline-flex items-center gap-[6px] shrink-0 transition-all active:scale-95"
            @click="openHabitCreate()"
          >
            <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
            시작하기
          </button>
          <button
            v-else
            type="button"
            class="relative after:absolute after:-inset-[5px] after:content-[''] size-[34px] rounded-full border border-apjek-border-strong bg-apjek-surface flex items-center justify-center shrink-0 transition-all active:scale-95"
            :aria-expanded="habitOpen"
            :aria-label="habitOpen ? '습관 카드 접기' : '습관 카드 펼치기'"
            @click="habitOpen = !habitOpen"
          >
            <Icon :name="habitOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="w-4 h-4 text-apjek-text" />
          </button>
        </div>

        <template v-if="habitOpen">
          <!-- 카드 안 토글 [✦ 나의 습관 기록][👥 친구와 함께 기록] — 선택=검정 채움 (R7) -->
          <div class="flex gap-[8px] mt-[16px]">
            <button
              type="button"
              class="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] flex-1 h-[40px] rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-[6px] transition-all active:scale-[0.97]"
              :class="mode === 'solo' ? 'bg-apjek-cta text-white' : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
              :aria-pressed="mode === 'solo'"
              @click="setMode('solo')"
            >
              <Icon name="lucide:sparkles" class="w-4 h-4" />
              나의 습관 기록
            </button>
            <button
              type="button"
              class="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] flex-1 h-[40px] rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-[6px] transition-all active:scale-[0.97]"
              :class="mode === 'friend' ? 'bg-apjek-cta text-white' : 'bg-apjek-surface text-apjek-text border border-apjek-border-strong'"
              :aria-pressed="mode === 'friend'"
              @click="setMode('friend')"
            >
              <Icon name="lucide:users" class="w-4 h-4" />
              친구와 함께 기록
            </button>
          </div>

          <div class="flex flex-col items-stretch w-full gap-[12px] mt-[16px]">
            <!-- 로드 실패 -->
            <div v-if="habitsLoaded && habitLoadError" class="w-full text-center text-[13px] text-riso-poppy py-[24px]">
              습관을 불러오지 못했어요. 잠시 후 다시 시도해 주세요
              <button
                type="button"
                class="relative after:absolute after:inset-x-0 after:-inset-y-[14px] after:content-[''] mt-[8px] block mx-auto text-[12px] font-semibold text-apjek-blue underline"
                @click="loadHabits"
              >
                다시 시도
              </button>
            </div>

            <!-- 트래커 카드 (습관은 1개만 — 과거 데이터로 여러 개면 모두 표출) -->
            <template v-else-if="visibleTrackers.length > 0">
              <RecordHabitTrackerCard
                v-for="tr in visibleTrackers"
                :key="tr.id"
                :tracker="tr"
                :view="viewOf(tr)"
                :busy="habitBusy"
                @checkin="onCheckIn"
                @stop="onStopHabit"
                @cancel-request="onCancelRequest"
                @cheer="onCheerRequest"
                @complete="onCompleteHabit"
                @extend="onExtendHabit"
                @accept="onAcceptHabit"
                @decline="onDeclineHabit"
              />
            </template>

            <!-- 빈 상태 — ⊠ + 안내 + [✏️ 시작하기] (다른 유형 습관이 활성이면 비활성 + 안내, 댓글 #29) -->
            <div v-else class="w-full flex flex-col items-center gap-[10px] py-[18px]">
              <div class="size-[44px] rounded-[12px] border border-apjek-border-strong flex items-center justify-center text-apjek-text-faint" aria-hidden="true">
                <Icon name="lucide:x" class="w-5 h-5" />
              </div>
              <p class="text-[13px] text-apjek-text-sub">
                {{ mode === 'solo' ? '나의 습관 기록이 없습니다' : '친구와 함께 기록이 없습니다' }}
              </p>
              <button
                type="button"
                class="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] h-[40px] px-[18px] rounded-full bg-apjek-cta text-white text-[13px] font-semibold inline-flex items-center gap-[6px] transition-all active:scale-95 disabled:opacity-40"
                :disabled="hasAnyHabit"
                @click="openHabitCreate()"
              >
                <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
                시작하기
              </button>
              <p v-if="hasAnyHabit" class="text-[11px] text-apjek-text-faint text-center">
                습관 기록은 한 번에 1개만 진행할 수 있어요. 진행 중인 기록을 완료하거나 중단한 뒤 시작해 주세요.
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── 일상 기록 ─── -->
    <div class="space-y-[14px]" data-layout-anchor="record-daily-section">
      <div>
        <h2 class="apjek-section-title text-[18px] leading-[28px]">
          일상 기록
        </h2>
        <p class="text-[14px] text-apjek-text-sub tracking-[-0.3px] leading-[20px] mt-[4px]">
          다양한 방법으로 일상을 기록하고 토큰을 획득해요
        </p>
      </div>

      <!-- 4행 리스트 카드 — 파스텔 타일 아이콘 + 기록명 + "+토큰명" + 우측 [✏️ 기록하기] 필 버튼.
           행 본체는 비클릭, 버튼만 시트를 연다 (R6b, 댓글 #5/#6). -->
      <div class="flex flex-col gap-[12px]">
        <div
          v-for="card in DAILY_CARDS"
          :key="card.modal"
          class="apjek-card p-[16px] flex items-center gap-[14px] w-full"
        >
          <!-- 타일 아이콘 — Figma 토큰 아이콘 PNG(이슬/햇살/번개/바람) 그대로. 파스텔 배경은 이미지에 포함. -->
          <img
            :src="card.icon"
            alt=""
            class="size-[56px] shrink-0 select-none"
            aria-hidden="true"
            draggable="false"
          >

          <div class="flex-1 min-w-0">
            <p class="text-[16px] font-bold text-apjek-text tracking-[-0.3px] leading-[22px] truncate">
              {{ card.title }}
            </p>
            <p class="text-[12px] leading-[16px] mt-[2px]" :style="{ color: card.accent }">
              +{{ card.token }}
            </p>
          </div>

          <button
            type="button"
            class="relative after:absolute after:inset-x-0 after:-inset-y-[5px] after:content-[''] h-[34px] px-[12px] rounded-full border border-apjek-border-strong bg-apjek-surface text-[13px] font-semibold text-apjek-text inline-flex items-center gap-[6px] shrink-0 transition-all active:scale-95"
            :aria-label="`${card.title} 기록하기`"
            @click="openModal = card.modal"
          >
            <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
            기록하기
          </button>
        </div>
      </div>

      <!-- 최근 기록 목록은 Figma(8/21) 기록탭에 없다 — 캘린더 페이지가 기록 조회를 맡는다.
           카테고리·친구 목록 로드 실패만 재시도 카드로 알린다(HTTP 에러 침묵 방지, audit C4-1). -->
      <div v-if="loadError" class="apjek-card p-5 text-center">
        <p class="text-[13px] text-apjek-text-sub mb-3">기록 정보를 불러오지 못했어요</p>
        <button
          type="button"
          class="relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] px-5 py-2 rounded-full bg-apjek-cta text-white text-[13px] font-bold"
          @click="retryInitial()"
        >다시 시도</button>
      </div>
    </div>

    <!-- ═══════ 일상기록 모달 (바텀시트) ═══════ -->
    <!-- 백드롭/패널/핸들/닫기/trap/뒤로가기는 CommonBottomSheet 내장. 진행 중 타이머/추적
         보호(구 onBackdrop 가드)는 focus/distance 시트의 @close(onSheetClose)가 유지한다. -->

    <!-- 투두 시트 (R1b) — 항목/루틴 상태는 시트가 소유, 완료 시 note 만 받아 저장 -->
    <RecordTodoSheet
      ref="todoSheet"
      :open="openModal === 'todo'"
      :submitting="submitting"
      @close="closeModal()"
      @submit="saveTodo"
    />

    <!-- 일기 시트 (R8) -->
    <CommonBottomSheet :open="openModal === 'diary'" ariaLabel="일기 기록" @close="closeModal()">
      <template #header>
        <div class="flex items-center gap-2 px-5 py-3 border-b border-apjek-border mr-9">
          <span class="text-[18px]">☀️</span>
          <span class="font-bold text-[16px] text-apjek-text">일기 기록</span>
        </div>
      </template>
      <div class="px-5 py-4 flex flex-col gap-3">
        <div class="text-[12px] text-apjek-text-sub font-medium">{{ todayLongLabel }}</div>
        <input
          v-model="diaryTitle"
          placeholder="제목 (선택)"
          class="w-full text-[16px] font-bold border-b border-apjek-border pb-2 outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-transparent text-apjek-text placeholder:text-apjek-text-faint"
        >
        <textarea
          v-model="diaryText"
          placeholder="오늘 하루를 기록해보세요."
          rows="9"
          class="w-full flex-1 text-[14px] text-apjek-text leading-relaxed outline-none focus:ring-2 focus:ring-apjek-blue/30 resize-none bg-transparent placeholder:text-apjek-text-faint"
        />
        <!-- 사진 첨부 (선택) — Figma 에 없으나 실기능 유지 (§4-8) -->
        <div class="flex items-center justify-between pt-1">
          <span class="text-[13px] font-semibold text-apjek-text-sub">사진 첨부 <span class="text-[11px] font-normal text-apjek-text-faint">(선택)</span></span>
          <button
            v-if="photoUrl"
            type="button"
            class="text-[12px] text-riso-poppy underline"
            @click="onClearPhoto"
          >
            삭제
          </button>
        </div>
        <button
          v-if="!photoUrl"
          type="button"
          class="w-full h-11 rounded-[12px] border border-dashed border-apjek-border-strong text-[13px] font-medium text-apjek-text-sub flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          :disabled="uploadingPhoto"
          @click="diaryFileInput?.click()"
        >
          <Icon name="lucide:camera" class="w-4 h-4" />
          <span>{{ uploadingPhoto ? '업로드 중...' : '사진 추가' }}</span>
        </button>
        <img
          v-else
          :src="photoUrl"
          alt="첨부한 사진 미리보기"
          class="w-full max-h-[200px] object-cover rounded-[12px] riso-shadow-sm"
        >
        <input
          ref="diaryFileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="onFileSelected"
        >
      </div>
      <div class="px-5 pb-1 pt-2">
        <!-- 지급량은 서버가 결정 — 하드코딩 수치 노출 금지 (R4-FE) -->
        <div class="text-[12px] text-apjek-text-faint text-center mb-2">저장 시 햇살토큰 지급</div>
        <button
          type="button"
          class="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50 bg-apjek-cta"
          :disabled="submitting"
          @click="saveDiary"
        >
          <Icon name="lucide:save" class="w-4 h-4" />저장하기
        </button>
      </div>
    </CommonBottomSheet>

    <!-- 집중 시트 (R8) — 타이머 진행 중 실수 닫기 방지 가드(onSheetClose) 유지 -->
    <CommonBottomSheet :open="openModal === 'focus'" ariaLabel="집중 기록" @close="onSheetClose()">
      <template #header>
        <div class="flex items-center gap-2 px-5 py-3 border-b border-apjek-border mr-9">
          <span class="text-[18px]">⚡</span>
          <span class="font-bold text-[16px] text-apjek-text">집중 기록</span>
        </div>
      </template>
      <div class="px-5 pt-5 pb-1 flex flex-col gap-4">
        <template v-if="focusPhase === 'setup'">
          <div>
            <label for="focus-name" class="text-[12px] font-semibold text-apjek-text-sub mb-1 block">타이머 이름</label>
            <input
              id="focus-name"
              v-model="focusName"
              placeholder="기록 이름 작성"
              maxlength="30"
              class="w-full h-[48px] rounded-[12px] px-4 text-[14px] outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
            >
          </div>
          <div>
            <label for="focus-minutes" class="text-[12px] font-semibold text-apjek-text-sub mb-1 block">집중 시간 (분)</label>
            <input
              id="focus-minutes"
              v-model="focusMinutes"
              type="number"
              min="1"
              max="180"
              placeholder="25"
              class="w-full h-[48px] rounded-[12px] px-4 text-[14px] outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
            >
          </div>
          <!-- 지급량은 서버가 결정 — Figma "+10" 은 실지급(BE)과 달라 수치 없이 표기 (§4-5 보류) -->
          <div class="text-[12px] text-apjek-text-faint text-center">저장 시 번개토큰 지급</div>
          <button
            type="button"
            class="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-[0.98] bg-apjek-cta"
            @click="startFocus"
          >
            <Icon name="lucide:play" class="w-4 h-4" />시작하기
          </button>
        </template>

        <div v-else class="flex flex-col items-center gap-6 py-2">
          <div class="text-[16px] font-bold text-apjek-text">{{ focusName }}</div>
          <div class="relative size-40">
            <!-- 원형 프로그레스 — 보라(바람 토큰 팔레트 #A9A0E8 계열, Figma 집중 링). CSS var 는
                 presentation attr 에서 미해석이라 currentColor + text-apjek-wind 클래스로 지정 -->
            <svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f1eefb" stroke-width="8" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8"
                class="text-apjek-wind"
                :stroke-dasharray="`${2 * Math.PI * 45}`"
                :stroke-dashoffset="`${2 * Math.PI * 45 * (1 - focusProgress / 100)}`"
                stroke-linecap="round" style="transition: stroke-dashoffset 1s linear"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[32px] font-bold text-apjek-text">{{ fmtTime(focusRemaining) }}</span>
              <span class="text-[12px] text-apjek-text-faint">남은 시간</span>
            </div>
          </div>

          <div v-if="focusPhase === 'done'" class="flex flex-col items-center gap-3 w-full">
            <div class="text-apjek-wind font-bold text-[16px]">집중 완료!</div>
            <button
              type="button"
              class="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold disabled:opacity-50 bg-apjek-cta"
              :disabled="submitting"
              @click="saveFocus(focusTotalSecs)"
            >
              <Icon name="lucide:zap" class="w-4 h-4" />기록 저장
            </button>
          </div>
          <!-- 진행 중 — Figma: 검정 [기록 저장] (누르면 타이머를 멈추고 지금까지의 시간을 저장) -->
          <button
            v-else
            type="button"
            class="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold bg-apjek-cta transition-all active:scale-[0.98] disabled:opacity-50"
            :disabled="submitting"
            @click="stopFocus"
          >
            <Icon name="lucide:zap" class="w-4 h-4" />기록 저장
          </button>
        </div>
      </div>
    </CommonBottomSheet>

    <!-- 거리 시트 (R8) — 추적 진행 중 실수 닫기 방지 가드(onSheetClose) 유지 -->
    <CommonBottomSheet :open="openModal === 'distance'" ariaLabel="거리 기록" @close="onSheetClose()">
      <template #header>
        <div class="flex items-center gap-2 px-5 py-3 border-b border-apjek-border mr-9">
          <span class="text-[18px]">🌀</span>
          <span class="font-bold text-[16px] text-apjek-text">거리 기록</span>
        </div>
      </template>
      <div class="px-5 pt-5 pb-3 flex flex-col gap-4">
        <div v-if="distError" class="text-riso-poppy text-[13px] text-center">{{ distError }}</div>

        <!-- 입력 전 — 기록 이름 + 안내 + [▷ 시작하기] -->
        <template v-if="distPhase === 'idle'">
          <div>
            <label for="distance-name" class="text-[12px] font-semibold text-apjek-text-sub mb-1 block">기록 이름</label>
            <input
              id="distance-name"
              v-model="distName"
              placeholder="기록 이름 작성"
              maxlength="30"
              class="w-full h-[48px] rounded-[12px] px-4 text-[14px] outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
            >
          </div>
          <!-- 지급량은 서버가 결정 — 하드코딩 수치 노출 금지 (R4-FE) -->
          <div class="text-[12px] text-apjek-text-faint text-center leading-[18px]">
            시작 후 이동하면 거리가 자동으로 측정돼요<br>저장 시 바람토큰 지급
          </div>
          <button
            type="button"
            class="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-[0.98] bg-apjek-cta"
            @click="startDistance"
          >
            <Icon name="lucide:play" class="w-4 h-4" />시작하기
          </button>
        </template>

        <!-- 측정 중 / 종료 — "0.000 km" + "● 00:00" -->
        <div v-else class="flex flex-col items-center gap-5 py-2">
          <div v-if="distName" class="text-[16px] font-bold text-apjek-text">{{ distName }}</div>
          <div class="flex items-baseline gap-2">
            <span class="text-[44px] font-bold text-apjek-text leading-none">{{ (distance / 1000).toFixed(3) }}</span>
            <span class="text-[16px] text-apjek-text-sub">km</span>
          </div>
          <div class="flex items-center gap-2 text-apjek-text-sub">
            <span class="w-2 h-2 rounded-full" :class="distPhase === 'tracking' ? 'bg-riso-green animate-pulse' : 'bg-apjek-border-strong'" />
            <span class="text-[14px] font-mono">{{ fmtTime(distElapsed) }}</span>
            <span v-if="distPhase === 'tracking'" class="text-[12px] text-riso-green">측정 중</span>
          </div>

          <!-- 측정 중 — 흰 [거리 저장] → 종료 후 검정 [기록 저장] -->
          <button
            v-if="distPhase === 'tracking'"
            type="button"
            class="w-full h-12 rounded-full flex items-center justify-center gap-2 font-semibold text-apjek-text border border-apjek-text bg-apjek-surface transition-all active:scale-[0.98]"
            @click="stopDistance"
          >
            <Icon name="lucide:stop-circle" class="w-4 h-4" />거리 저장
          </button>
          <div v-else class="flex flex-col gap-2 w-full">
            <button
              type="button"
              class="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50 bg-apjek-cta"
              :disabled="submitting"
              @click="saveDistance"
            >
              <Icon name="lucide:map-pin" class="w-4 h-4" />기록 저장
            </button>
            <button
              type="button"
              class="w-full h-10 rounded-full text-[13px] text-apjek-text-faint border border-apjek-border"
              @click="resetDistance"
            >
              다시 측정
            </button>
          </div>
        </div>
      </div>
    </CommonBottomSheet>

    <!-- 습관 생성 3단계 시트 (R2) -->
    <RecordHabitCreateSheet
      :open="habitCreateOpen"
      :friends="friends"
      :busy="creatingHabit"
      @close="habitCreateOpen = false"
      @submit="onHabitCreate"
    />

    <!-- 응원 시트 (R3b) — 친구 미기록 습관에서 진입. 전송/토스트는 본 페이지가 담당 -->
    <RecordCheerSheet
      :open="cheerTarget !== null"
      :friend-nickname="cheerTarget?.friendNickname ?? '친구'"
      :busy="cheerBusy"
      @close="cheerTarget = null"
      @submit="submitCheer"
    />

    <!-- 일상 기록 완료 카드 토스트 (R4) + 파티클 (N-C1) -->
    <RecordCompleteToast
      :open="completeToast !== null"
      :kind="completeToast?.kind ?? 'dew'"
      :count="completeToast?.count ?? null"
      @close="completeToast = null"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  CategoryListResponse,
  CategoryResponse,
  CreateRecordRequest,
  CreateRecordResponse,
  FriendInfo,
  HabitCycleRewardResponse,
  HabitTrackerResponse,
  PhotoUploadResponse,
  RewardInfo,
} from '@terraworld-it/openapi-frontend'
import { TOKEN_ICON_SRC } from '~/utils/currency'
import { useUserStore } from '~/stores/user'
import { deriveHabitView, type HabitView } from '~/utils/habitState'
import type { DailyTokenKind } from '~/components/record/RecordCompleteToast.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { trackRecordCreated } = useGtagEvents()
const userStore = useUserStore()
const {
  trackers,
  loaded: habitsLoaded,
  loadError: habitLoadError,
  load: loadHabits,
  create: createHabit,
  checkIn,
  stop: stopHabit,
  accept: acceptHabit,
  decline: declineHabit,
  complete: completeHabit,
  extend: extendHabit,
} = useHabits()

// ─── 습관 기록 상태 (R2/R7) ───
type Mode = 'solo' | 'friend'
const mode = ref<Mode>('solo')

// 아프젝 습관 카드 접기/펴기 — 메인은 접힌 헤더만, ^ 토글이 본문(모드 칩 + 트래커)을 편다 (R6b).
const habitOpen = ref<boolean>(false)
const habitCreateOpen = ref<boolean>(false)
const creatingHabit = ref<boolean>(false)
// 체크인/중단/완료/연장 공용 busy — 카드 간 공유
const habitBusy = ref<boolean>(false)
const friends = ref<FriendInfo[]>([])

// 표시 대상 = 진행 중 트래커(PENDING/ACTIVE/COMPLETED_UNCLAIMED). 목록 API 가 COMPLETED/BROKEN 을
// 제외하지만 방어적으로 한 번 더 거른다.
const liveTrackers = computed<HabitTrackerResponse[]>(() =>
  trackers.value.filter(tr => tr.status !== 'BROKEN' && tr.status !== 'COMPLETED'))
const soloTrackers = computed<HabitTrackerResponse[]>(() => liveTrackers.value.filter(tr => !tr.friendLinked))
const friendTrackers = computed<HabitTrackerResponse[]>(() => liveTrackers.value.filter(tr => !!tr.friendLinked))
const visibleTrackers = computed<HabitTrackerResponse[]>(() => (mode.value === 'solo' ? soloTrackers.value : friendTrackers.value))
// 습관은 1개만 (댓글 #29) — 어느 유형이든 진행 중이면 새 시작 불가.
const hasAnyHabit = computed<boolean>(() => liveTrackers.value.length > 0)

function viewOf(tr: HabitTrackerResponse): HabitView {
  return deriveHabitView(tr)
}

// mode 전환 시 표시 목록이 즉시 교체됨 — 전환 전 키보드 해제 (utils/keyboard.ts 참조).
function setMode(next: Mode) {
  if (mode.value === next) return
  void dismissKeyboard()
  mode.value = next
}

// 캘린더로 페이지 이동 시에도 입력이 포커스된 채 언마운트될 수 있음.
function goToCalendar() {
  void dismissKeyboard()
  navigateTo('/calendar')
}

function openHabitCreate() {
  if (hasAnyHabit.value) {
    toast.info('습관 기록은 한 번에 1개만 진행할 수 있어요')
    return
  }
  habitCreateOpen.value = true
}

async function onHabitCreate(payload: { title: string; friendUserId: string | null }) {
  if (creatingHabit.value) return
  creatingHabit.value = true
  try {
    // 서버가 friendUserId 를 수락된 invite 로 검증해 연동 — 상대 수락 전 PENDING, 양측 완주 시 반짝이 200.
    const { data: tracker, status, code } = await createHabit(payload.title, payload.friendUserId)
    if (!tracker) {
      if (status === 409 && code === 'HABIT_LIMIT_EXCEEDED') {
        // 활성 1개 제한 — 서버가 SoT. 로컬 목록이 비어 있었다면(다른 기기에서 생성 등) 다시 받아 카드를 보여 준다.
        toast.error('이미 진행 중인 습관이 있어요')
        habitCreateOpen.value = false
        habitOpen.value = true
        await loadHabits()
      }
      else if (status === 409) toast.error('이미 진행 중인 습관이 있어요')
      else if (payload.friendUserId) toast.error('친구 요청에 실패했어요. 수락된 친구인지 확인해주세요')
      else toast.error('습관 생성에 실패했어요')
      return
    }
    habitCreateOpen.value = false
    mode.value = payload.friendUserId ? 'friend' : 'solo'
    habitOpen.value = true
    if (payload.friendUserId) toast.success(`${tracker.friendNickname ?? '친구'} 에게 함께 기록 요청을 보냈어요`)
    else toast.success(`'${tracker.title}' 습관을 시작했어요`)
  }
  finally {
    creatingHabit.value = false
  }
}

async function onCheckIn(tr: HabitTrackerResponse) {
  if (tr.status !== 'ACTIVE' || habitBusy.value) return
  habitBusy.value = true
  try {
    const { data: result, status, code } = await checkIn(tr.id)
    if (!result) {
      // 수락 전(PENDING) 체크인 — 친구 수락 후 기록 시작.
      if (status === 409 && code === 'HABIT_NOT_ACTIVE') toast.info('친구가 수락하면 기록이 시작돼요')
      else toast.error('체크인에 실패했어요')
      return
    }
    if (result.cycleCompleted) {
      // 7일째 — 카드는 완주 대기(COMPLETED_UNCLAIMED) 화면으로 전환. 보상은 [기록 완료하기]/[연장] 에서 지급.
      toast.success('7일 완주! 기록을 완료하거나 1주일 연장해 보세요')
    }
    else {
      toast.success('오늘 체크인 완료')
    }
  }
  catch (e) {
    toast.error((e as Error).message ?? '체크인에 실패했어요')
  }
  finally {
    habitBusy.value = false
  }
}

// 중단 후 남은 습관이 없으면 처음 화면(접힌 카드 + [시작하기])으로 복귀 (댓글 #37).
function collapseIfEmpty() {
  if (!hasAnyHabit.value) habitOpen.value = false
}

async function onStopHabit(tr: HabitTrackerResponse) {
  if (habitBusy.value) return
  habitBusy.value = true
  try {
    const ok = await stopHabit(tr.id)
    if (ok) {
      toast.success(`'${tr.title}' 기록을 중단했어요`)
      collapseIfEmpty()
    }
    else {
      toast.error('기록 중단에 실패했어요')
    }
  }
  finally {
    habitBusy.value = false
  }
}

// 요청 대기 중 취소 — DELETE /habits/{id} 가 PENDING 이면 양측 요청 취소(CANCELLED, 트래커 BROKEN).
async function onCancelRequest(tr: HabitTrackerResponse) {
  if (habitBusy.value) return
  habitBusy.value = true
  try {
    const ok = await stopHabit(tr.id)
    if (ok) {
      toast.success('함께 기록 요청을 취소했어요')
      collapseIfEmpty()
    }
    else {
      toast.error('요청 취소에 실패했어요')
    }
  }
  finally {
    habitBusy.value = false
  }
}

// 완주 보상 반영 — 지급분이 있으면 토스트 + 지갑 갱신, 멱등 재생(alreadyClaimed)이면 조용히 목록만 맞춘다.
async function applyCycleReward(reward: HabitCycleRewardResponse): Promise<void> {
  if (reward.alreadyClaimed || reward.sparkleGranted <= 0) {
    await loadHabits()
    return
  }
  userStore.updateCurrency(reward.updatedCurrency)
  toast.success(`7일 완주! 반짝이 ${reward.sparkleGranted}개 획득 ⭐`)
}

async function onCompleteHabit(tr: HabitTrackerResponse) {
  if (habitBusy.value) return
  habitBusy.value = true
  try {
    const { data, status, code } = await completeHabit(tr.id)
    if (!data) {
      // 완주 대기 상태가 아님(이미 종료/중단 등) — 서버 상태로 다시 맞춘다.
      if (status === 409 && code === 'HABIT_INVALID_STATE') await loadHabits()
      toast.error('기록 완료 처리에 실패했어요')
      return
    }
    await applyCycleReward(data)
    collapseIfEmpty()
  }
  finally {
    habitBusy.value = false
  }
}

async function onExtendHabit(tr: HabitTrackerResponse) {
  if (habitBusy.value) return
  habitBusy.value = true
  try {
    const { data, status, code } = await extendHabit(tr.id)
    if (!data) {
      if (status === 409 && code === 'HABIT_INVALID_STATE') await loadHabits()
      toast.error('연장에 실패했어요')
      return
    }
    await applyCycleReward(data)
    // friend 연장은 상대 수락 필요(응답 트래커 PENDING / extendStatus=PENDING_SENT) — 상단 토스트 (댓글 #56).
    const next = data.tracker
    if (next.status === 'PENDING' && next.extendStatus === 'PENDING_SENT') {
      toast.success(`${next.friendNickname ?? tr.friendNickname ?? '친구'} 에게 연장 요청 성공!`)
    }
    else {
      toast.success('기록을 1주일 연장했어요')
    }
  }
  finally {
    habitBusy.value = false
  }
}

// 친구가 보낸 함께 기록/연장 요청 수락 — 내 미러 트래커 id 로 호출, 양측 ACTIVE.
async function onAcceptHabit(tr: HabitTrackerResponse) {
  if (habitBusy.value) return
  habitBusy.value = true
  try {
    const { data, status, code } = await acceptHabit(tr.id)
    if (!data) {
      // 요청이 이미 취소/만료됨 — 서버 상태로 다시 맞춘다.
      if (status === 409 && code === 'HABIT_INVALID_STATE') await loadHabits()
      toast.error('요청 수락에 실패했어요')
      return
    }
    mode.value = 'friend'
    toast.success(`${data.friendNickname ?? tr.friendNickname ?? '친구'}님과 함께 기록을 시작해요`)
  }
  finally {
    habitBusy.value = false
  }
}

// 친구가 보낸 요청 거절 — 양측 BROKEN(목록 제외).
async function onDeclineHabit(tr: HabitTrackerResponse) {
  if (habitBusy.value) return
  habitBusy.value = true
  try {
    const { data, status, code } = await declineHabit(tr.id)
    if (!data) {
      if (status === 409 && code === 'HABIT_INVALID_STATE') await loadHabits()
      toast.error('요청 거절에 실패했어요')
      return
    }
    toast.success('함께 기록 요청을 거절했어요')
    collapseIfEmpty()
  }
  finally {
    habitBusy.value = false
  }
}

// ─── 습관 응원 (R3b) ───
// 친구 미기록(partnerIdle) 습관 카드의 응원 버튼 → 시트 → cheerHabit 전송.
const cheerTarget = ref<HabitTrackerResponse | null>(null)
const cheerBusy = ref<boolean>(false)

function onCheerRequest(tr: HabitTrackerResponse) {
  if (cheerBusy.value) return
  cheerTarget.value = tr
}

async function submitCheer(message: string) {
  const target = cheerTarget.value
  if (!target || cheerBusy.value) return
  cheerBusy.value = true
  try {
    const { error, response } = await sdk.cheerHabit({
      client,
      path: { trackerId: target.id },
      body: { message },
    })
    if (error) {
      // 429 = 일일 응원 한도 소진. 그 외(백엔드 미구현 404 포함)는 일반 안내.
      if (response.status === 429) toast.error('오늘은 응원을 모두 보냈어요')
      else toast.error('응원 전송에 실패했어요. 잠시 후 다시 시도해주세요')
      return
    }
    // TODO(C4 머지 후): useToast variant:'pill'(핑크 외곽선 필) 로 전환
    toast.success(`${target.friendNickname ?? '친구'} 에게 응원 메세지 전달 성공!`)
    cheerTarget.value = null
  }
  catch {
    toast.error('응원 전송에 실패했어요. 잠시 후 다시 시도해주세요')
  }
  finally {
    cheerBusy.value = false
  }
}

// ─── 일상 기록 (시트) ───
type DailyModal = 'todo' | 'diary' | 'focus' | 'distance'
const openModal = ref<DailyModal | null>(null)

// 일상 기록 시트 4종의 focus trap + 배경 스크롤 잠금 + ESC + Android 뒤로가기는
// CommonBottomSheet 가 내장 처리한다(이중 등록 금지).
const submitting = ref<boolean>(false)
const categories = ref<CategoryResponse[]>([])
// FE-10: 교체-대입 전용 리스트(로드/생성 모두 새 배열 재할당) — deep reactivity 불필요.

// 아프젝 리스트 카드 — 파스텔 타일 배경 + 토큰 글리프/서브텍스트 색 (tailwind.css 토큰 참조)
const DAILY_CARDS: { title: string; token: string; accent: string; icon: string; modal: DailyModal }[] = [
  { title: '투두리스트 기록', token: '이슬토큰', accent: 'var(--color-apjek-dew)', icon: TOKEN_ICON_SRC.DEW, modal: 'todo' },
  { title: '일기 기록', token: '햇살토큰', accent: 'var(--color-apjek-sun)', icon: TOKEN_ICON_SRC.SUN, modal: 'diary' },
  { title: '집중 기록', token: '번개토큰', accent: 'var(--color-apjek-bolt)', icon: TOKEN_ICON_SRC.BOLT, modal: 'focus' },
  { title: '거리 기록', token: '바람토큰', accent: 'var(--color-apjek-wind)', icon: TOKEN_ICON_SRC.WIND, modal: 'distance' },
]

// dailyType → categoryId 매핑. 시스템 카테고리 이름으로 안정 매칭(admin 편집/row-order
// 변동에 안전 — 배열 index 는 순서 불보장이라 오매핑 위험). 보상 토큰 정합:
// PHOTO=이슬/산책, DIARY=햇살/독서, FOCUS=번개/러닝, DISTANCE=바람/낙서.
// isCustom=false(시스템) + name 으로 find, 없으면 첫 시스템 카테고리 fallback.
const DAILY_TYPE_CATEGORY_NAME: Record<NonNullable<CreateRecordRequest['dailyType']>, string> = {
  PHOTO: '산책',
  DIARY: '독서',
  FOCUS: '러닝',
  DISTANCE: '낙서',
}

function categoryIdFor(dailyType: NonNullable<CreateRecordRequest['dailyType']>): number | null {
  const targetName = DAILY_TYPE_CATEGORY_NAME[dailyType]
  const match = categories.value.find(c => !c.isCustom && c.name === targetName)
  const fallback = categories.value.find(c => !c.isCustom) ?? categories.value[0]
  return (match ?? fallback)?.id ?? null
}

// 일기 날짜 — Figma "2026년 8월 4일 화요일"
const todayLongLabel = computed<string>(() =>
  new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
)

function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// 집중/거리 시트의 닫기 요청(백드롭/X/ESC/뒤로가기/핸들 드래그) 가드 — 진행 중인
// 타이머/추적이 있으면 실수 닫기로 기록이 유실되지 않게 무시한다 (TW2 동작 확장).
function onSheetClose() {
  if (openModal.value === 'focus' && focusPhase.value !== 'setup') return
  if (openModal.value === 'distance' && distPhase.value !== 'idle') return
  closeModal()
}

function closeModal() {
  // todo/diary 시트의 input/textarea 가 포커스를 유지한 채 즉시 unmount 되면 키보드가 안
  // 닫힐 수 있음 (utils/keyboard.ts 참조).
  void dismissKeyboard()
  openModal.value = null
}

// 공통 기록 저장 — dailyType 기준 보상 라우팅.
// 성공 시 서버가 실제 지급한 reward 를 함께 반환한다 — 완료 토스트가 이 값을 표시 (R4-FE).
async function saveDailyRecord(dailyType: NonNullable<CreateRecordRequest['dailyType']>, opts: {
  duration?: number | null
  note?: string | null
  photoUrl?: string | null
}): Promise<{ ok: boolean; reward: RewardInfo | null }> {
  const categoryId = categoryIdFor(dailyType)
  if (categoryId === null) {
    toast.error('카테고리를 불러오지 못했어요')
    return { ok: false, reward: null }
  }
  if (submitting.value) return { ok: false, reward: null }
  submitting.value = true
  try {
    const body: CreateRecordRequest = {
      categoryId,
      dailyType,
      duration: opts.duration ?? null,
      note: opts.note ?? null,
      photoUrl: opts.photoUrl ?? null,
      partnerUserId: null,
    }
    const { data, error } = await sdk.createRecord({ client, body })
    if (error) throw new Error(errMsg(error, '기록 생성 실패'))
    const created = castData<CreateRecordResponse>(data)
    let reward: RewardInfo | null = null
    if (created) {
      reward = created.reward ?? null
      if (reward) {
        trackRecordCreated({
          categoryId,
          categoryName: created.record.categoryName ?? '',
          basicCoins: reward.basicCoins,
          categoryTokens: reward.categoryTokens,
        })
      }
      await userStore.fetchMe(true) // 기록 보상 지급 반영 — TTL 캐시 무시
    }
    return { ok: true, reward }
  }
  catch (e) {
    toast.error((e as Error).message)
    return { ok: false, reward: null }
  }
  finally {
    submitting.value = false
  }
}

// 완료 카드 토스트 (R4) — 서버 응답 categoryTokens 를 동적 표시. 0/누락이면 수치 없이
// "○○토큰 획득!" 로 표기해 실지급과 다른 거짓 숫자를 화면에 남기지 않는다. 탭 → /calendar.
// TODO(C4 머지 후): useToast({title, description, icon, variant:'card'}) 로 대체.
const completeToast = ref<{ kind: DailyTokenKind; count: number | null } | null>(null)

function showCompleteToast(kind: DailyTokenKind, reward: RewardInfo | null) {
  const n = reward?.categoryTokens
  completeToast.value = { kind, count: typeof n === 'number' && n > 0 ? n : null }
}

// ── 투두 시트 (R1b) — 항목/루틴 상태는 RecordTodoSheet 가 소유 ──
const todoSheet = ref<{ clear: () => void } | null>(null)

async function saveTodo(note: string) {
  const { ok, reward } = await saveDailyRecord('PHOTO', { note })
  if (ok) {
    todoSheet.value?.clear()
    closeModal()
    showCompleteToast('dew', reward)
  }
}

// ── 일기 시트 ──
const diaryTitle = ref<string>('')
const diaryText = ref<string>('')

// 사진 첨부 — POST /uploads/photo 응답의 photoUrl 보관. 저장 시 record body 에 포함.
// WebView 의 <input type=file> 는 네이티브 파일 피커(카메라/갤러리)를 띄우고 File 을 바로 준다.
const photoUrl = ref<string>('')
const uploadingPhoto = ref<boolean>(false)
const diaryFileInput = ref<HTMLInputElement | null>(null)

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingPhoto.value = true
  try {
    // 인증 헤더는 plugins/openapi.ts 인터셉터가 자동 주입. multipart 직렬화는 SDK 담당.
    const { data, error } = await sdk.uploadPhoto({ client, body: { file } })
    if (error) throw new Error(errMsg(error, '업로드 실패'))
    const typed = castData<PhotoUploadResponse>(data)
    if (!typed?.photoUrl) throw new Error('photoUrl 누락')
    // R2/CDN 미설정 시 백엔드(PhotoUploadService)가 base64 `data:` URL 을 반환한다. 이는 records
    // .photo_url(VARCHAR 2048, V7)을 초과해 record 저장이 실패하므로(업로드는 성공한 뒤 저장만 깨짐)
    // 첨부하지 않고 우아하게 degrade — 일기는 사진 없이 저장된다. R2 설정되면 실 CDN URL 이라 정상 첨부.
    if (typed.photoUrl.startsWith('data:')) {
      toast.info('사진 첨부는 서비스 준비 중이에요. 글은 그대로 저장할 수 있어요.')
      return
    }
    photoUrl.value = typed.photoUrl
    toast.success('사진을 첨부했어요')
  }
  catch (e) {
    toast.error(`사진 업로드에 실패했어요: ${(e as Error).message}`)
  }
  finally {
    uploadingPhoto.value = false
    if (diaryFileInput.value) diaryFileInput.value.value = ''
  }
}

function onClearPhoto() {
  photoUrl.value = ''
}

async function saveDiary() {
  const text = diaryText.value.trim()
  if (!text) {
    toast.error('일기 내용을 입력해주세요')
    return
  }
  const note = diaryTitle.value.trim() ? `${diaryTitle.value.trim()}\n${text}` : text
  const { ok, reward } = await saveDailyRecord('DIARY', { note, photoUrl: photoUrl.value || null })
  if (ok) {
    diaryTitle.value = ''
    diaryText.value = ''
    photoUrl.value = ''
    closeModal()
    showCompleteToast('sun', reward)
  }
}

// ── 집중 시트 (타이머) ──
type FocusPhase = 'setup' | 'running' | 'done'
const focusPhase = ref<FocusPhase>('setup')
const focusName = ref<string>('')
const focusMinutes = ref<string>('25')
const focusRemaining = ref<number>(0)
const focusElapsed = ref<number>(0)
let focusTimer: ReturnType<typeof setInterval> | null = null

const focusTotalSecs = computed<number>(() => (Number.parseInt(focusMinutes.value) || 0) * 60)
const focusProgress = computed<number>(() =>
  focusTotalSecs.value > 0 ? ((focusTotalSecs.value - focusRemaining.value) / focusTotalSecs.value) * 100 : 0,
)

function clearFocusTimer() {
  if (focusTimer) {
    clearInterval(focusTimer)
    focusTimer = null
  }
}

function resetFocus() {
  clearFocusTimer()
  focusPhase.value = 'setup'
  focusName.value = ''
  focusMinutes.value = '25'
  focusRemaining.value = 0
  focusElapsed.value = 0
}

function startFocus() {
  const secs = (Number.parseInt(focusMinutes.value) || 0) * 60
  if (secs <= 0) {
    toast.error('시간을 올바르게 입력해주세요')
    return
  }
  if (!focusName.value.trim()) {
    toast.error('타이머 이름을 입력해주세요')
    return
  }
  // 설정 단계의 이름/시간 input 이 포커스를 유지한 채 phase 전환으로 즉시 사라지면
  // 키보드가 안 닫힐 수 있음 (utils/keyboard.ts 참조).
  void dismissKeyboard()
  focusRemaining.value = secs
  focusElapsed.value = 0
  focusPhase.value = 'running'
  focusTimer = setInterval(() => {
    if (focusRemaining.value <= 1) {
      focusRemaining.value = 0
      clearFocusTimer()
      focusPhase.value = 'done'
      return
    }
    focusRemaining.value -= 1
    focusElapsed.value += 1
  }, 1000)
}

async function stopFocus() {
  clearFocusTimer()
  const done = focusElapsed.value || (focusTotalSecs.value - focusRemaining.value)
  await saveFocus(done)
}

async function saveFocus(durationSecs: number) {
  // 거리 기록과 동일 클래스: 60초 미만이면 반올림 0 → backend @Min(1) 400. 하한 1분.
  const minutes = Math.max(1, Math.round(durationSecs / 60))
  const { ok, reward } = await saveDailyRecord('FOCUS', { duration: minutes, note: focusName.value })
  if (ok) {
    resetFocus()
    closeModal()
    showCompleteToast('bolt', reward)
  }
}

// 거리 기록 이름 (R8) — note 에 "{이름} · {km}km" 로 포함
const distName = ref<string>('')

// ── 거리 모달 (Geolocation) ──
type DistPhase = 'idle' | 'tracking' | 'done'
interface Coord { lat: number; lng: number }
const distPhase = ref<DistPhase>('idle')
const distance = ref<number>(0)
const distElapsed = ref<number>(0)
const distError = ref<string>('')
let distWatchId: number | null = null
let distTimer: ReturnType<typeof setInterval> | null = null
let distPrev: Coord | null = null

// ─── 네이티브 백그라운드 트래커 (2026-07-21 — Codex 설계 [A]) ───
// 가용 시 웹 watch 대신 네이티브 fix 큐를 단일 소스로 사용(전경 5s polling + 복귀/종료 drain).
// 서비스는 전경/배경 모두 수집하므로 웹 watch 와 병행하면 이중 집계 — 병행 금지.
// 플러그인 부재(웹/구버전 셸)·시작 실패 시 기존 웹 watch + 복귀 하한 보정으로 폴백.
let nativeTracking = false
let nativeSessionId = ''
let nativeLastSeq = 0
let nativeDrainTimer: ReturnType<typeof setInterval> | null = null
// 세션 세대 토큰 — 비동기 start 가 완료되기 전에 세션이 리셋/이탈되면(gen 불일치) 결과를
// 폐기하고 서비스를 즉시 중지한다 (Codex R1 F3 — start 대기창 race).
let distSessionGen = 0

function applyNativeFixes(fixes: import('~/lib/nativeDistanceTracker').DistanceFix[]) {
  for (const f of fixes) {
    if (f.seq <= nativeLastSeq) continue
    nativeLastSeq = f.seq
    if (f.accuracy > 50) continue // 저정확도 fix 배제 (도심 캐니언/실내 오차)
    const curr = { lat: f.lat, lng: f.lng }
    if (distPrev) {
      const d = haversine(distPrev, curr)
      if (d < 50) distance.value += d
    }
    distPrev = curr
  }
}

async function drainNative() {
  if (!nativeTracking) return
  try {
    const { DistanceTracker } = await import('~/lib/nativeDistanceTracker')
    const { fixes } = await DistanceTracker.drain({ sessionId: nativeSessionId, afterSeq: nativeLastSeq })
    applyNativeFixes(fixes)
  }
  catch {
    // drain 실패는 일시적일 수 있음 — 다음 주기/복귀에서 재시도 (거리 유실은 seq 로 방지).
  }
}

function haversine(a: Coord, b: Coord): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function clearDistWatch() {
  if (distWatchId !== null && import.meta.client && navigator.geolocation) {
    navigator.geolocation.clearWatch(distWatchId)
  }
  distWatchId = null
  if (distTimer) {
    clearInterval(distTimer)
    distTimer = null
  }
}

function resetDistance() {
  distSessionGen += 1 // 진행 중(pending) 네이티브 start 무효화 (Codex R1 F3)
  abortNativeTracking()
  clearDistWatch()
  distPhase.value = 'idle'
  distance.value = 0
  distElapsed.value = 0
  distError.value = ''
  distPrev = null
}

function beginDistanceWatch() {
  distWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      // 일시 오류(TIMEOUT 등) 후 정상 fix 가 오면 배너를 걷는다 — 성공 중에도 붉은
      // 오류가 요약 단계까지 남던 문제(2026-07-21 라이브 실측).
      distError.value = ''
      const curr = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      if (distPrev) {
        const d = haversine(distPrev, curr)
        if (d < 50) distance.value += d
      }
      distPrev = curr
    },
    (err) => {
      // err.message 는 브라우저에 따라 빈 문자열일 수 있어 "위치 오류:" 만 노출됐다
      // (2026-07-21 라이브 실측) — 코드별 한국어 문구로 고정.
      distError.value = err.code === GeolocationPositionError.PERMISSION_DENIED
        ? '위치 권한이 꺼져 있어요. 설정에서 허용 후 다시 시작해 주세요'
        : '위치를 가져오지 못했어요. GPS 신호를 확인해 주세요'
      // PERMISSION_DENIED(1) 은 사용자가 재허용하기 전까지 복구 불가 — 'tracking' 상태로
      // 타이머만 계속 도는 상태로 방치하지 않고 idle 로 되돌린다(Codex 감사 지적).
      // TIMEOUT/POSITION_UNAVAILABLE(2/3) 은 일시적일 수 있어 계속 시도.
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        clearDistWatch()
        distPhase.value = 'idle'
      }
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 },
  )
}

async function startDistance() {
  if (!import.meta.client || !navigator.geolocation) {
    distError.value = '이 기기에서 위치 서비스를 지원하지 않습니다'
    return
  }
  distPhase.value = 'tracking'
  distance.value = 0
  distPrev = null
  distTimer = setInterval(() => {
    distElapsed.value += 1
  }, 1000)

  // 네이티브 트래커 우선 (백그라운드에서도 수집 유지). 화면이 보이는 지금 시점에 시작해야
  // while-in-use FGS 제약을 만족한다. 실패/권한거부(coarse-only 포함, 플러그인이 명시
  // reject)·GPS 꺼짐 시 웹 watch 폴백.
  nativeTracking = false
  const gen = ++distSessionGen
  try {
    const { isNativeDistanceTrackerAvailable, DistanceTracker } = await import('~/lib/nativeDistanceTracker')
    if (await isNativeDistanceTrackerAvailable()) {
      // 권한 선확보: 웹 프롬프트(WebView→앱 권한 브리지)로 먼저 확보. 명시 거부면 웹 watch
      // 폴백(거부 에러 UI 를 기존 경로가 표시). precise/GPS 검증은 플러그인 start 가 수행.
      const permitted = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          err => resolve(err.code !== GeolocationPositionError.PERMISSION_DENIED),
          { timeout: 6000, maximumAge: 60000 },
        )
      })
      if (permitted && gen === distSessionGen && distPhase.value === 'tracking') {
        const sessionId = crypto.randomUUID()
        await DistanceTracker.start({ sessionId })
        // start 대기 중 세션이 리셋/이탈됐으면(gen 불일치) 서비스 즉시 회수 (Codex R1 F3).
        if (gen !== distSessionGen || distPhase.value !== 'tracking') {
          void DistanceTracker.stop({ sessionId, afterSeq: 0 }).catch(() => {})
          return
        }
        nativeSessionId = sessionId
        nativeLastSeq = 0
        nativeTracking = true
        // start 대기창에서 resume 이 웹 watch 를 먼저 띄웠을 수 있다 — 이중 집계 방지 강제 정리.
        if (distWatchId !== null) {
          navigator.geolocation.clearWatch(distWatchId)
          distWatchId = null
        }
        nativeDrainTimer = setInterval(() => { void drainNative() }, 5000)
      }
    }
  }
  catch {
    nativeTracking = false
  }
  if (gen !== distSessionGen || distPhase.value !== 'tracking') return
  if (!nativeTracking && distWatchId === null) beginDistanceWatch()
}

// 앱이 백그라운드로 가면 watcher/타이머를 명시적으로 정리(배터리 낭비 방지 — WKWebView 는
// 백그라운드 시 JS 실행이 멈춰 사실상 자동 정지되지만 Android WebView 는 보장이 약함).
//
// 백그라운드→포그라운드 복구 정책 (2026-07-21 사용자 리포트 — 기존엔 구간 전체 유실):
//  - 경과 시간: 벽시계(bgPauseAt) 기준으로 백그라운드 구간을 가산.
//  - 거리: 진입 시점 좌표 → 복귀 시점 좌표의 직선거리(하한)를 가산. 도보/러닝 개연
//    속도(≤12 m/s)일 때만 인정해 차량 이동·GPS 점프로 인한 뻥튀기를 배제.
//  - 한계: 곡선 경로는 하한으로만 집계된다. 완전한 백그라운드 트래킹은 네이티브 백그라운드
//    위치 플러그인(Android foreground service / iOS background mode + 스토어 정책 선언)이
//    필요해 별도 트랙 — 본 복구는 그 전까지의 웹 레이어 브리지.
let bgPauseAt: number | null = null
let bgLastCoord: Coord | null = null
// pause/resume 중첩 가드 — 복귀 보정(getCurrentPosition)이 대기 중일 때 또 pause 되면
// stale 콜백이 distPrev/거리를 덮거나 백그라운드에서 watch 를 켤 수 있다 (Codex R2 #4).
let bgEpoch = 0

function pauseDistanceWatchForBackground() {
  if (distPhase.value !== 'tracking') return
  bgEpoch += 1
  bgPauseAt = Date.now()
  bgLastCoord = distPrev
  // 네이티브 경로: 서비스가 백그라운드에서도 계속 수집 — JS 쪽 polling 만 멈춘다.
  if (nativeDrainTimer) {
    clearInterval(nativeDrainTimer)
    nativeDrainTimer = null
  }
  if (distWatchId !== null) {
    navigator.geolocation.clearWatch(distWatchId)
    distWatchId = null
  }
  if (distTimer) {
    clearInterval(distTimer)
    distTimer = null
  }
}
function resumeDistanceWatchFromBackground() {
  if (distPhase.value !== 'tracking') return
  // 네이티브 경로: 백그라운드 fix 를 drain 으로 회수 — 직선거리 보정 불요(실경로 반영).
  if (nativeTracking) {
    const gap = bgPauseAt !== null ? Date.now() - bgPauseAt : 0
    if (gap > 0) distElapsed.value += Math.floor(gap / 1000)
    bgPauseAt = null
    bgLastCoord = null
    void drainNative()
    if (!nativeDrainTimer) nativeDrainTimer = setInterval(() => { void drainNative() }, 5000)
    if (!distTimer) distTimer = setInterval(() => { distElapsed.value += 1 }, 1000)
    return
  }
  if (distWatchId !== null) return
  const anchor = bgLastCoord
  const gapMs = bgPauseAt !== null ? Date.now() - bgPauseAt : 0
  if (gapMs > 0) distElapsed.value += Math.floor(gapMs / 1000)
  bgPauseAt = null
  bgLastCoord = null
  distPrev = null
  if (!distTimer) distTimer = setInterval(() => { distElapsed.value += 1 }, 1000)

  // 복귀 좌표를 **먼저 확정·가산**하고 그 좌표를 기준점(distPrev)으로 삼은 뒤 watch 를
  // 시작한다 — watch 를 먼저 켜면 복귀 후 이동분이 watch 와 anchor 보정에 이중 집계되어
  // "직선거리 하한"이 깨진다 (Codex R1 F4). epoch 캡처: 콜백 대기 중 재-pause 되면
  // stale 콜백을 폐기한다 (Codex R2 #4).
  const epoch = bgEpoch
  function startWebResumeWatch() {
    if (epoch !== bgEpoch || distPhase.value !== 'tracking' || distWatchId !== null || nativeTracking) return
    if (import.meta.client && document.hidden) return // 백그라운드에서 watch 기동 금지
    beginDistanceWatch()
  }
  if (anchor && gapMs > 3000 && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // hidden 검사 포함 — pause 이벤트가 아직 전달되지 않은 숨김 직후 창에서의 상태 오염 방지
        // (Codex R3 #2).
        if (epoch !== bgEpoch || distPhase.value !== 'tracking' || (import.meta.client && document.hidden)) return
        const curr = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const d = haversine(anchor, curr)
        const secs = Math.max(1, gapMs / 1000)
        if (d / secs <= 12) distance.value += d
        distPrev = curr
        startWebResumeWatch()
      },
      () => {
        // 복귀 좌표 획득 실패 — 보정 없이 watch 재개 (다음 픽스부터 정상 집계).
        startWebResumeWatch()
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }
  else {
    startWebResumeWatch()
  }
}

async function stopDistance() {
  // 네이티브 경로: 서비스 종료 + 잔여 fix 회수 (orphan FGS 방지).
  if (nativeTracking) {
    nativeTracking = false
    if (nativeDrainTimer) {
      clearInterval(nativeDrainTimer)
      nativeDrainTimer = null
    }
    try {
      const { DistanceTracker } = await import('~/lib/nativeDistanceTracker')
      const { fixes } = await DistanceTracker.stop({ sessionId: nativeSessionId, afterSeq: nativeLastSeq })
      applyNativeFixes(fixes)
    }
    catch {
      // 종료 drain 실패 — 이미 회수된 거리까지만 반영.
    }
  }
  clearDistWatch()
  distPhase.value = 'done'
}

/** 라우트 이탈/모달 강제 종료 시 네이티브 서비스 잔존 방지 (fire-and-forget). */
function abortNativeTracking() {
  if (!nativeTracking) return
  nativeTracking = false
  if (nativeDrainTimer) {
    clearInterval(nativeDrainTimer)
    nativeDrainTimer = null
  }
  void import('~/lib/nativeDistanceTracker')
    .then(({ DistanceTracker }) => DistanceTracker.stop({ sessionId: nativeSessionId, afterSeq: nativeLastSeq }))
    .catch(() => {})
}

async function saveDistance() {
  const km = (distance.value / 1000).toFixed(2)
  const { ok, reward } = await saveDailyRecord('DISTANCE', {
    // 60초 미만 세션은 반올림이 0 이 되어 backend @Min(1) 검증에 걸린다
    // (2026-07-21 라이브 실측: 400 "duration: 1 이상이어야 합니다") — 하한 1분.
    duration: Math.max(1, Math.round(distElapsed.value / 60)),
    // 기록 이름(R8)이 있으면 함께 남긴다 — "{이름} · {km}km"
    note: distName.value.trim() ? `${distName.value.trim()} · ${km}km` : `${km}km`,
  })
  if (ok) {
    distName.value = ''
    resetDistance()
    closeModal()
    showCompleteToast('wind', reward)
  }
}

// 시트 전환 시 타이머/추적 정리 (누수 방지). 투두 루틴 로드/프리필은 RecordTodoSheet 가 열림 시 수행.
watch(openModal, (next, prev) => {
  if (prev === 'focus' && next !== 'focus') resetFocus()
  if (prev === 'distance' && next !== 'distance') resetDistance()
})

let removePauseListener: (() => void) | null = null
let removeResumeListener: (() => void) | null = null
// App.addListener() 는 비동기라, 등록이 resolve 되기 전에 이 컴포넌트가 이미 unmount 됐을 수
// 있다(빠른 라우트 이탈). 그 경우 onBeforeUnmount 시점엔 remove 함수가 아직 null 이라 stale
// listener 가 영구히 남는다(Codex Round 3 지적) — disposed 플래그로 늦게 도착한 등록도 즉시 정리.
let disposed = false

onBeforeUnmount(() => {
  clearFocusTimer()
  distSessionGen += 1 // pending 네이티브 start 무효화 — 이탈 후 서비스 기동 방지 (Codex R1 F3)
  bgEpoch += 1 // pending 복귀 보정(getCurrentPosition) 무효화 — 이탈 후 watch 재생성 방지 (Codex R3 #3)
  abortNativeTracking()
  clearDistWatch()
  disposed = true
  removePauseListener?.()
  removeResumeListener?.()
})

// ─── 초기 로드 ───
const loadError = ref<boolean>(false)

async function loadInitial() {
  loadError.value = false
  try {
    const [catRes, friRes] = await Promise.all([
      sdk.listCategories({ client }),
      sdk.listFriends({ client }),
    ])
    if (!catRes.error) {
      categories.value = castData<CategoryListResponse>(catRes.data)?.categories ?? []
    }
    if (!friRes.error) {
      friends.value = (castData<FriendInfo[]>(friRes.data) ?? []) as FriendInfo[]
    }
    // HTTP 에러(res.error)는 throw 하지 않아 조용히 빈 목록으로 위장되던 문제(audit C4-1) —
    // 하나라도 실패하면 에러 상태로 승격해 재시도 UI 를 보인다.
    if (catRes.error || friRes.error) {
      loadError.value = true
    }
  }
  catch {
    loadError.value = true
  }
}

function retryInitial() {
  void loadInitial()
}

onMounted(() => {
  void loadInitial()
  loadHabits()

  // 거리 추적 중 백그라운드 전환 시 watcher 정리 + 복귀 시 재개(Codex 감사 지적).
  const { isNative } = useNative()
  if (isNative) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('pause', pauseDistanceWatchForBackground).then((h) => {
        if (disposed) { h.remove(); return }
        removePauseListener = () => h.remove()
      })
      App.addListener('resume', resumeDistanceWatchFromBackground).then((h) => {
        if (disposed) { h.remove(); return }
        removeResumeListener = () => h.remove()
      })
    })
  }
  else {
    // 일반 모바일 브라우저 — 탭 백그라운드 전환에도 같은 pause/resume 정책 적용
    // (미연결 시 벽시계/거리 보정이 전혀 동작하지 않았다, Codex R1 F5).
    function onVisibilityChange() {
      if (document.hidden) pauseDistanceWatchForBackground()
      else resumeDistanceWatchFromBackground()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    removePauseListener = () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>
