<template>
  <div class="min-h-screen space-y-[28px] pb-4">
    <!-- 헤더 — 아프젝: 타이틀 + 우상단 다크 필 [캘린더] 버튼 (frame-record-main) -->
    <div class="flex items-center justify-between py-[10px]">
      <h1 class="font-bold text-[28px] text-apjek-text tracking-[-0.9px] leading-[32px]">
        기록하기
      </h1>
      <button
        type="button"
        class="apjek-cta h-[40px] px-[16px] text-[13px] transition-all active:scale-95"
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

      <!-- 습관 카드 — 아프젝 화이트 카드: 좌측 핑크 반짝이 타일 + "+반짝이" + 우측 고스트 버튼.
           버튼이 카드 본문(모드 칩 + 트래커 목록)을 접고 편다 (frame-record-main ↔ frame-habit-create). -->
      <div class="apjek-card p-[16px]">
        <div class="flex items-center gap-[14px]">
          <div
            class="size-[56px] rounded-[18px] shrink-0 flex items-center justify-center text-apjek-sparkle"
            style="background: radial-gradient(circle at 32% 32%, #ffe3f3 0%, var(--color-apjek-sparkle-bg) 55%, rgba(251, 147, 207, 0.35) 100%)"
          >
            <Icon name="lucide:sparkles" class="w-6 h-6" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[16px] font-bold text-apjek-text tracking-[-0.3px] leading-[22px]">1주일 연속 기록</p>
            <p class="text-[12px] leading-[16px] mt-[2px] text-apjek-sparkle">+반짝이</p>
          </div>
          <button
            type="button"
            class="h-[34px] px-[12px] rounded-full border border-apjek-border-strong bg-apjek-surface text-[13px] font-semibold text-apjek-text inline-flex items-center gap-[6px] shrink-0 transition-all active:scale-95"
            :aria-expanded="habitOpen"
            @click="habitOpen = !habitOpen"
          >
            <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
            {{ habitOpen ? '접기' : hasActiveHabit ? '기록하기' : '시작하기' }}
          </button>
        </div>

        <template v-if="habitOpen">
          <!-- 모드 선택 칩 — 활성=연블루 배경+블루 보더 (frame-habit-create) -->
          <div class="flex gap-[8px] mt-[16px]">
            <button
              type="button"
              class="apjek-chip flex-1 h-[44px] text-[14px] font-semibold transition-all active:scale-[0.97]"
              :class="mode === 'solo' ? 'apjek-chip-active border-apjek-blue' : ''"
              @click="setMode('solo')"
            >
              <Icon name="lucide:sparkles" class="w-4 h-4" />
              나의 습관 기록
            </button>

            <button
              type="button"
              class="apjek-chip flex-1 h-[44px] text-[14px] font-semibold transition-all active:scale-[0.97]"
              :class="mode === 'friend' ? 'apjek-chip-active border-apjek-blue' : ''"
              @click="setMode('friend')"
            >
              <Icon name="lucide:users" class="w-4 h-4" />
              친구와 함께 기록
            </button>
          </div>

          <!-- 습관 목록 — solo/친구별 N개 카드 (2026-07-21 n:n 재구성: 구 find-first 단일 뷰 제거) -->
          <div class="flex flex-col items-stretch w-full gap-[12px] mt-[16px]">
        <!-- 로드 실패 -->
        <div v-if="habitsLoaded && habitLoadError" class="w-full text-center text-[13px] text-riso-poppy py-[24px]">
          습관을 불러오지 못했어요. 잠시 후 다시 시도해 주세요
          <button
            type="button"
            class="mt-[8px] block mx-auto text-[12px] font-semibold text-apjek-blue underline"
            @click="loadHabits"
          >
            다시 시도
          </button>
        </div>

        <!-- 나의 습관 탭: 활성 습관 리스트 + 추가 폼 (여러 개 허용) -->
        <template v-else-if="mode === 'solo'">
          <RecordHabitTrackerCard
            v-for="tr in soloTrackers"
            :key="tr.id"
            :tracker="tr"
            :busy="checkInBusy"
            @checkin="onCheckIn"
            @stop="onStopHabit"
            @cheer="onCheerRequest"
          />
          <div class="w-full">
            <div class="flex items-center justify-between w-full">
              <p class="text-[14px] font-bold text-black tracking-[-0.15px]">
                {{ soloTrackers.length > 0 ? '새 습관 추가' : '습관 기록 생성' }}
              </p>
              <button
                type="button"
                class="h-[32px] px-[10px] rounded-[12px] flex items-center gap-[6px] transition-all active:scale-95 hover:bg-gray-100 disabled:opacity-50"
                :disabled="creatingHabit"
                @click="submitSoloHabit"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <g clip-path="url(#clip_pencil)">
                    <path
                      d="M14.116 4.54133C14.4685 4.18895 14.6665 3.71098 14.6666 3.21257C14.6667 2.71416 14.4687 2.23614 14.1163 1.88367C13.7639 1.53119 13.286 1.33314 12.7876 1.33308C12.2892 1.33302 11.8111 1.53095 11.4587 1.88333L2.56133 10.7827C2.40655 10.937 2.29208 11.127 2.228 11.336L1.34733 14.2373C1.3301 14.295 1.3288 14.3562 1.34357 14.4146C1.35833 14.4729 1.38861 14.5262 1.4312 14.5687C1.47378 14.6112 1.52708 14.6414 1.58544 14.6561C1.6438 14.6707 1.70504 14.6693 1.76267 14.652L4.66467 13.772C4.87345 13.7085 5.06345 13.5947 5.218 13.4407L14.116 4.54133Z"
                      stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333"
                    />
                  </g>
                  <defs><clipPath id="clip_pencil"><rect fill="white" width="16" height="16" /></clipPath></defs>
                </svg>
                <span class="text-[14px] font-semibold text-black tracking-[-0.15px]">작성</span>
              </button>
            </div>
            <div class="mt-[12px] w-full">
              <textarea
                v-model="habitInput"
                placeholder="1주일 동안 실천할 습관을 적어주세요"
                rows="3"
                maxlength="30"
                class="w-full rounded-[12px] p-[16px] text-[14px] resize-none outline-none focus:ring-2 focus:ring-apjek-blue/30 leading-[20px] tracking-[-0.15px] bg-apjek-bg text-apjek-text"
                style="min-height: 60px"
                @keydown.enter.exact.prevent="submitSoloHabit"
              />
            </div>
          </div>
        </template>

        <!-- 친구와 함께 탭: 친구별 그룹 — 친구 수만큼 표출, 친구마다 습관 1개 + 없는 친구는 만들기 -->
        <template v-else>
          <p class="text-[11px] text-apjek-text-faint leading-[16px]">
            습관을 만들면 친구에게 알림이 가요. 친구도 나를 선택해 습관을 만들면
            서로의 체크인 알림을 받고, 7일 완주 보상이 <span class="font-semibold text-apjek-sparkle">2배</span>가 돼요
          </p>

          <div
            v-for="friend in friends"
            :key="friend.userId"
            class="w-full flex flex-col gap-[8px]"
          >
            <div class="w-full rounded-[12px] flex items-center gap-[12px] p-[12px] bg-apjek-bg">
              <div
                class="size-[36px] rounded-full flex items-center justify-center text-[18px] shrink-0"
                style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)"
              >
                🌍
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[14px] font-semibold text-apjek-text leading-[20px] tracking-[-0.15px] truncate">
                  {{ friend.nickname }}
                </p>
                <p class="text-[10px] text-apjek-text-faint leading-[15px] tracking-[0.117px]">
                  {{ trackerByFriend.get(friend.userId) ? '함께 습관 진행 중' : '아직 함께하는 습관이 없어요' }}
                </p>
              </div>
              <button
                v-if="!trackerByFriend.get(friend.userId) && friendFormFor !== friend.userId"
                type="button"
                class="rounded-full px-[10px] py-[6px] text-[11px] font-semibold transition-all active:scale-95 shrink-0 bg-apjek-cta text-white"
                @click="openFriendForm(friend.userId)"
              >
                + 함께 습관 만들기
              </button>
            </div>

            <!-- 이 친구와의 활성 습관 카드 -->
            <RecordHabitTrackerCard
              v-if="trackerByFriend.get(friend.userId)"
              :tracker="trackerByFriend.get(friend.userId)!"
              :busy="checkInBusy"
              @checkin="onCheckIn"
              @stop="onStopHabit"
              @cheer="onCheerRequest"
            />

            <!-- 인라인 생성 폼 (해당 친구 선택 시) -->
            <div v-else-if="friendFormFor === friend.userId" class="w-full rounded-[12px] border border-apjek-border p-[12px] flex flex-col gap-[8px]">
              <textarea
                v-model="friendHabitInput"
                :placeholder="`${friend.nickname}님과 1주일 동안 실천할 습관을 적어주세요`"
                rows="2"
                maxlength="30"
                class="w-full rounded-[12px] p-[12px] text-[14px] resize-none outline-none focus:ring-2 focus:ring-apjek-blue/30 leading-[20px] tracking-[-0.15px] bg-apjek-bg text-apjek-text"
                @keydown.enter.exact.prevent="submitFriendHabit(friend.userId)"
              />
              <div class="flex gap-[8px] justify-end">
                <button
                  type="button"
                  class="px-[12px] py-[6px] rounded-[10px] text-[12px] text-apjek-text-faint transition active:scale-95"
                  :disabled="creatingHabit"
                  @click="closeFriendForm"
                >
                  취소
                </button>
                <button
                  type="button"
                  class="px-[12px] py-[6px] rounded-full text-[12px] font-semibold text-white bg-apjek-cta transition active:scale-95 disabled:opacity-50"
                  :disabled="creatingHabit"
                  @click="submitFriendHabit(friend.userId)"
                >
                  함께 시작
                </button>
              </div>
            </div>
          </div>

          <!-- 친구 목록에 없는(관계 변동 등) 연동 습관도 표출 누락 금지 -->
          <RecordHabitTrackerCard
            v-for="tr in orphanFriendTrackers"
            :key="tr.id"
            :tracker="tr"
            :busy="checkInBusy"
            @checkin="onCheckIn"
            @stop="onStopHabit"
            @cheer="onCheerRequest"
          />

            <div v-if="friends.length === 0" class="text-[12px] text-apjek-text-faint text-center py-[8px]">
              함께 할 친구가 없어요.
              <NuxtLink to="/friends" class="text-apjek-blue underline font-semibold">친구 초대하기</NuxtLink>
            </div>
          </template>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── 일상 기록 ─── -->
    <div class="space-y-[14px]">
      <div>
        <h2 class="apjek-section-title text-[18px] leading-[28px]">
          일상 기록
        </h2>
        <p class="text-[14px] text-apjek-text-sub tracking-[-0.3px] leading-[20px] mt-[4px]">
          다양한 방법으로 일상을 기록하고 토큰을 획득해요
        </p>
      </div>

      <!-- 4행 리스트 카드 — 파스텔 타일 아이콘 + 기록명 + "+토큰명" + [기록하기] 고스트 버튼
           (frame-record-main. 구 2×2 파스텔 그리드 대체. 카드 전체 탭 = 시트 열기 유지) -->
      <div class="flex flex-col gap-[12px]">
        <button
          v-for="card in DAILY_CARDS"
          :key="card.modal"
          type="button"
          class="apjek-card p-[16px] flex items-center gap-[14px] text-left w-full transition-all active:scale-[0.98]"
          @click="openModal = card.modal"
        >
          <!-- 파스텔 타일 아이콘 — 글리프는 기존 Figma svg 재사용, 색만 토큰 컬러로 -->
          <div
            class="size-[56px] rounded-[18px] shrink-0 flex items-center justify-center"
            :style="{ background: card.tileBg, color: card.accent }"
          >
            <!-- 투두(물방울) 아이콘 -->
            <svg v-if="card.modal === 'todo'" class="w-5 h-7" fill="none" viewBox="0 0 13.0012 18.8869">
              <path :d="svgPaths.p2050f600" fill="currentColor" />
              <path :d="svgPaths.p33366f00" fill="currentColor" />
            </svg>
            <!-- 일기(햇살) 아이콘 -->
            <svg v-else-if="card.modal === 'diary'" class="w-6 h-6" fill="none" viewBox="0 0 20 20">
              <g clip-path="url(#clip_diary)">
                <path :d="svgPaths.p16c5400" fill="currentColor" />
                <path :d="svgPaths.p1278f00" fill="currentColor" />
                <path :d="svgPaths.p1cdb9500" fill="currentColor" />
                <path :d="svgPaths.p7f01a80" fill="currentColor" />
                <path :d="svgPaths.p1bdb4e00" fill="currentColor" />
                <path :d="svgPaths.p10744b00" fill="currentColor" />
                <path :d="svgPaths.p4834b80" fill="currentColor" />
                <path :d="svgPaths.p11269980" fill="currentColor" />
                <path :d="svgPaths.p311b7500" fill="currentColor" />
              </g>
              <defs><clipPath id="clip_diary"><rect fill="white" width="20" height="20" /></clipPath></defs>
            </svg>
            <!-- 집중(번개) 아이콘 -->
            <svg v-else-if="card.modal === 'focus'" class="w-6 h-6" fill="none" viewBox="0 0 20 20">
              <path :d="svgPaths.p3a2fa580" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
            </svg>
            <!-- 거리(바람) 아이콘 -->
            <svg v-else class="w-6 h-5" fill="none" viewBox="0 0 17 14">
              <path :d="svgPaths.p11a72f00" fill="currentColor" />
              <path :d="svgPaths.p1131d400" fill="currentColor" />
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-[16px] font-bold text-apjek-text tracking-[-0.3px] leading-[22px] truncate">
              {{ card.title }}
            </p>
            <p class="text-[12px] leading-[16px] mt-[2px]" :style="{ color: card.accent }">
              +{{ card.token }}
            </p>
          </div>

          <!-- 시각적 고스트 버튼 (탭 타깃은 카드 전체 — 중첩 button 금지라 span) -->
          <span
            class="h-[34px] px-[12px] rounded-full border border-apjek-border-strong bg-apjek-surface text-[13px] font-semibold text-apjek-text inline-flex items-center gap-[6px] shrink-0"
          >
            <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
            기록하기
          </span>
        </button>
      </div>

      <!-- 최근 기록 — 위쪽 카드는 정적이라 즉시 그려진다. 서버 응답을 기다리는 건 이 블록뿐. -->
      <div v-if="pending">
        <h3 class="font-bold mb-3 text-apjek-text text-[15px]">{{ $t('record.recentRecords') }}</h3>
        <CommonLoading variant="skeleton" container-class="py-2" />
      </div>
      <!-- HTTP 에러가 침묵으로 "빈 목록"이 되어 진짜 빈 것과 구분 불가하던 문제(audit C4-1) -->
      <div v-else-if="loadError" class="apjek-card p-5 text-center">
        <p class="text-[13px] text-apjek-text-sub mb-3">기록 정보를 불러오지 못했어요</p>
        <button
          type="button"
          class="px-5 py-2 rounded-full bg-apjek-cta text-white text-[13px] font-bold"
          @click="retryInitial()"
        >다시 시도</button>
      </div>
      <div v-else-if="recentRecords.length > 0">
        <h3 class="font-bold mb-3 text-apjek-text text-[15px]">{{ $t('record.recentRecords') }}</h3>
        <div class="space-y-2">
          <!-- record/RecordCard.vue 의 auto-import 명은 RecordCard — 파일명이 디렉토리명으로
               시작하면 Nuxt 가 prefix 중복을 접는다. RecordRecordCard 는 미해석 커스텀 엘리먼트로
               조용히 렌더되어(프로덕션은 경고도 drop) 최근 기록 카드가 화면에서 사라졌었다. -->
          <RecordCard
            v-for="record in recentRecords"
            :key="record.id"
            :record="record"
          />
        </div>
      </div>
    </div>

    <!-- ═══════ 일상기록 모달 (바텀시트) ═══════ -->
    <!-- 백드롭/패널/핸들/닫기/trap/뒤로가기는 CommonBottomSheet 내장. 진행 중 타이머/추적
         보호(구 onBackdrop 가드)는 focus/distance 시트의 @close(onSheetClose)가 유지한다. -->

    <!-- 투두 모달 -->
    <CommonBottomSheet :open="openModal === 'todo'" ariaLabel="할일 기록" @close="closeModal()">
      <template #header>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-xl">💧</span>
            <span class="font-bold text-base text-black">투두리스트 기록</span>
          </div>
          <!-- 루틴 관리 진입 (R1-FE) — 시트 내장 X(우상단 absolute)와 겹치지 않게 mr 확보 -->
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-apjek-bg flex items-center justify-center mr-9 transition active:scale-95"
            aria-label="루틴 관리"
            :aria-expanded="routineOpen"
            @click="routineOpen = !routineOpen"
          >
            <Icon name="lucide:settings" class="w-4 h-4 text-apjek-text-sub" />
          </button>
        </div>
        <div class="px-5 pt-3 pb-2 shrink-0">
          <div class="flex gap-2">
            <input
              v-model="todoNew"
              placeholder="새 항목 추가 (최대 30개)"
              class="flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
              @keydown.enter="addTodo"
            >
            <button
              type="button"
              class="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-95 bg-apjek-cta"
              @click="addTodo"
            >
              <Icon name="lucide:plus" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </template>
      <div class="px-5 pb-2">
        <!-- 루틴 관리 패널 (R1-FE) — 목록 상태 SoT 는 페이지, 변이는 컴포넌트가 수행 후 이벤트 반영 -->
        <RecordTodoRoutineManager
          v-if="routineOpen"
          :routines="todoRoutines"
          class="mb-3"
          @created="onRoutineCreated"
          @updated="onRoutineUpdated"
          @deleted="onRoutineDeleted"
        />
        <div v-if="todos.length === 0" class="text-center py-8 text-gray-400">
          <div class="text-3xl mb-2">📋</div>
          <p class="text-sm">항목을 추가해보세요</p>
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="todo in todos"
            :key="todo.id"
            class="flex items-center gap-3 rounded-xl px-3 py-3 transition-all"
            :style="{ background: todo.checked ? 'var(--color-apjek-blue-soft)' : 'var(--color-apjek-bg)' }"
          >
            <button
              type="button"
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
              :style="{
                borderColor: todo.checked ? 'var(--color-apjek-blue)' : '#d1d5db',
                background: todo.checked ? 'var(--color-apjek-blue)' : 'transparent',
              }"
              @click="todo.checked = !todo.checked"
            >
              <Icon v-if="todo.checked" name="lucide:check" class="w-3 h-3 text-white" />
            </button>
            <span
              class="flex-1 text-sm"
              :style="{ color: todo.checked ? '#9ca3af' : '#1f2937', textDecoration: todo.checked ? 'line-through' : 'none' }"
            >
              {{ todo.text }}
            </span>
            <button type="button" @click="todos = todos.filter(t => t.id !== todo.id)">
              <Icon name="lucide:trash-2" class="w-3.5 h-3.5 text-red-300" />
            </button>
          </div>
        </div>
      </div>
      <div class="px-5 pb-1 pt-2">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>{{ todos.filter(t => t.checked).length }}/{{ todos.length }} 완료</span>
          <!-- 지급량은 서버가 결정 — 하드코딩 수치 노출 금지 (R4-FE) -->
          <span>완료 시 이슬토큰 지급</span>
        </div>
        <button
          type="button"
          class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 disabled:opacity-40"
          :disabled="!todoAllChecked || submitting"
          :style="todoAllChecked
            ? { background: 'var(--color-apjek-cta)', color: 'white' }
            : { background: 'var(--color-apjek-bg)', color: '#9ca3af' }"
          @click="saveTodo"
        >
          <Icon name="lucide:check" class="w-4 h-4" />
          {{ todoAllChecked ? '기록 완료' : '모든 항목 체크 후 완료 가능' }}
        </button>
      </div>
    </CommonBottomSheet>

    <!-- 일기 모달 -->
    <CommonBottomSheet :open="openModal === 'diary'" ariaLabel="일기 기록" @close="closeModal()">
      <template #header>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">☀️</span>
            <span class="font-bold text-base text-black">일기 기록</span>
          </div>
        </div>
      </template>
      <div class="px-5 py-4 flex flex-col gap-3">
        <div class="text-xs text-gray-400 font-medium">{{ todayLongLabel }}</div>
        <input
          v-model="diaryTitle"
          placeholder="제목 (선택)"
          class="w-full text-[16px] font-bold border-b border-gray-100 pb-2 outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-transparent placeholder:text-gray-300"
        >
        <textarea
          v-model="diaryText"
          placeholder="오늘 하루를 기록해보세요..."
          rows="10"
          class="w-full flex-1 text-[14px] text-gray-700 leading-relaxed outline-none focus:ring-2 focus:ring-apjek-blue/30 resize-none bg-transparent placeholder:text-gray-300"
        />
        <!-- 사진 첨부 (선택) -->
        <div class="flex items-center justify-between pt-1">
          <span class="text-[13px] font-semibold text-gray-600">사진 첨부 <span class="text-[11px] font-normal text-gray-400">(선택)</span></span>
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
          class="w-full h-11 rounded-[12px] border border-dashed border-gray-300 text-[13px] font-medium text-gray-500 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
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
        <div class="text-xs text-gray-400 text-center mb-2">저장 시 햇살토큰 지급</div>
        <button
          type="button"
          class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95 disabled:opacity-50 bg-apjek-cta"
          :disabled="submitting"
          @click="saveDiary"
        >
          <Icon name="lucide:save" class="w-4 h-4" />저장하기
        </button>
      </div>
    </CommonBottomSheet>

    <!-- 집중 모달 — 타이머 진행 중 실수 닫기 방지 가드(onSheetClose) 유지 -->
    <CommonBottomSheet :open="openModal === 'focus'" ariaLabel="집중 기록" @close="onSheetClose()">
      <template #header>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <span class="font-bold text-base text-black">집중 기록</span>
          </div>
        </div>
      </template>
      <div class="px-5 pt-6 pb-1 flex flex-col gap-4">
        <template v-if="focusPhase === 'setup'">
          <div>
            <label class="text-xs font-semibold text-gray-500 mb-1 block">타이머 이름</label>
            <input
              v-model="focusName"
              placeholder="예: 독서, 공부, 운동..."
              class="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
            >
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 mb-1 block">집중 시간 (분)</label>
            <input
              v-model="focusMinutes"
              type="number"
              min="1"
              max="180"
              placeholder="25"
              class="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-apjek-blue/30 bg-apjek-bg text-apjek-text"
            >
          </div>
          <!-- 지급량은 서버가 결정 — 하드코딩 수치 노출 금지 (R4-FE) -->
          <div class="text-xs text-gray-400 text-center">완료 시 번개토큰 지급</div>
          <button
            type="button"
            class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95 bg-apjek-cta"
            @click="startFocus"
          >
            <Icon name="lucide:play" class="w-4 h-4" />시작하기
          </button>
        </template>

        <div v-else class="flex flex-col items-center gap-6 py-4">
          <div class="text-lg font-bold text-gray-800">{{ focusName }}</div>
          <div class="relative size-40">
            <!-- 원형 프로그레스 — 아프젝 블루 (R6 사양). CSS var 는 presentation attr 에서
                 미해석이라 currentColor + text-apjek-blue 클래스로 지정 -->
            <svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f5f5f5" stroke-width="8" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8"
                class="text-apjek-blue"
                :stroke-dasharray="`${2 * Math.PI * 45}`"
                :stroke-dashoffset="`${2 * Math.PI * 45 * (1 - focusProgress / 100)}`"
                stroke-linecap="round" style="transition: stroke-dashoffset 1s linear"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-bold text-gray-800">{{ fmtTime(focusRemaining) }}</span>
              <span class="text-xs text-gray-400">남은 시간</span>
            </div>
          </div>

          <div v-if="focusPhase === 'done'" class="flex flex-col items-center gap-3 w-full">
            <div class="text-apjek-blue font-bold text-lg">🎉 집중 완료!</div>
            <button
              type="button"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold disabled:opacity-50 bg-apjek-cta"
              :disabled="submitting"
              @click="saveFocus(focusTotalSecs)"
            >
              <Icon name="lucide:zap" class="w-4 h-4" />기록 저장
            </button>
          </div>
          <button
            v-else
            type="button"
            class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-gray-700 border border-gray-200 transition-all active:scale-95 disabled:opacity-50"
            :disabled="submitting"
            @click="stopFocus"
          >
            <Icon name="lucide:square" class="w-4 h-4" />중간 저장
          </button>
        </div>
      </div>
    </CommonBottomSheet>

    <!-- 거리 모달 — 추적 진행 중 실수 닫기 방지 가드(onSheetClose) 유지 -->
    <CommonBottomSheet :open="openModal === 'distance'" ariaLabel="거리 기록" @close="onSheetClose()">
      <template #header>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌬️</span>
            <span class="font-bold text-base text-black">거리 기록</span>
          </div>
        </div>
      </template>
      <div class="px-5 pt-8 pb-3 flex flex-col items-center gap-6">
        <div v-if="distError" class="text-red-400 text-sm text-center">{{ distError }}</div>
        <div class="flex flex-col items-center gap-1">
          <div class="text-5xl font-bold text-gray-900">{{ (distance / 1000).toFixed(3) }}</div>
          <div class="text-gray-400 text-sm">km</div>
        </div>
        <div class="flex items-center gap-2 text-gray-500">
          <div class="w-2 h-2 rounded-full" :style="{ background: distPhase === 'tracking' ? '#22c55e' : '#e5e7eb' }" />
          <span class="text-sm font-mono">{{ fmtTime(distElapsed) }}</span>
          <span v-if="distPhase === 'tracking'" class="text-xs text-green-500 animate-pulse">추적 중</span>
        </div>
        <div class="w-full flex flex-col gap-3">
          <template v-if="distPhase === 'idle'">
            <!-- 지급량은 서버가 결정 — 하드코딩 수치 노출 금지 (R4-FE) -->
            <div class="text-xs text-gray-400 text-center">
              시작 후 이동하면 거리가 자동으로 측정돼요<br>완료 시 바람토큰 지급
            </div>
            <button
              type="button"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95 bg-apjek-cta"
              @click="startDistance"
            >
              <Icon name="lucide:play" class="w-4 h-4" />측정 시작
            </button>
          </template>
          <button
            v-else-if="distPhase === 'tracking'"
            type="button"
            class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white transition-all active:scale-95 bg-apjek-cta"
            @click="stopDistance"
          >
            <Icon name="lucide:stop-circle" class="w-4 h-4" />완료
          </button>
          <div v-else class="flex flex-col gap-2 w-full">
            <div class="text-center font-bold text-apjek-blue text-lg">측정 완료!</div>
            <button
              type="button"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95 disabled:opacity-50 bg-apjek-cta"
              :disabled="submitting"
              @click="saveDistance"
            >
              <Icon name="lucide:map-pin" class="w-4 h-4" />기록 저장
            </button>
            <button
              type="button"
              class="w-full h-10 rounded-2xl text-sm text-apjek-text-faint border border-apjek-border"
              @click="resetDistance"
            >
              다시 측정
            </button>
          </div>
        </div>
      </div>
    </CommonBottomSheet>

    <!-- 응원 팝업 (R3-FE) — 친구 참여 대기 습관에서 진입. 전송/토스트는 본 페이지가 담당 -->
    <RecordCheerPopup
      :open="cheerTarget !== null"
      :friend-nickname="cheerTarget?.friendNickname ?? '친구'"
      :busy="cheerBusy"
      @close="cheerTarget = null"
      @submit="submitCheer"
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
  HabitTrackerResponse,
  PagedRecordResponse,
  PhotoUploadResponse,
  RecordResponse,
  RewardInfo,
  TodoRoutineListResponse,
  TodoRoutineResponse,
} from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'
import svgPaths from './svg-paths'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()
const { trackRecordCreated } = useGtagEvents()
const userStore = useUserStore()
const { trackers, loaded: habitsLoaded, loadError: habitLoadError, load: loadHabits, create: createHabit, checkIn, stop: stopHabit } = useHabits()

// ─── 습관 기록 상태 ───
type Mode = 'solo' | 'friend'
const mode = ref<Mode>('solo')

// 아프젝 습관 카드 접기/펴기 — 메인은 접힌 헤더만(frame-record-main), [시작하기/기록하기]
// 버튼이 본문(모드 칩 + 트래커)을 편다(frame-habit-create). UI 표시 상태일 뿐 동작/API 불변.
const habitOpen = ref<boolean>(false)
const hasActiveHabit = computed<boolean>(() => trackers.value.some(tr => tr.status === 'ACTIVE'))

// mode 전환 시 표시 목록/폼이 즉시 교체됨 — 전환 전 키보드 해제 + 열린 인라인 폼 정리
// (utils/keyboard.ts 참조, Codex 감사 지적).
function setMode(next: Mode) {
  if (mode.value === next) return
  void dismissKeyboard()
  friendFormFor.value = null
  friendHabitInput.value = ''
  mode.value = next
}

// 캘린더로 페이지 이동 시에도 habitInput 이 포커스된 채 언마운트될 수 있음.
function goToCalendar() {
  void dismissKeyboard()
  navigateTo('/calendar')
}

const habitInput = ref<string>('')
const friendHabitInput = ref<string>('')
// 인라인 생성 폼이 열린 친구 (한 번에 하나) — 구 selectedFriendId(전역 폼 단일 선택) 대체.
const friendFormFor = ref<string | null>(null)
const creatingHabit = ref<boolean>(false)
const checkInBusy = ref<boolean>(false)
const friends = ref<FriendInfo[]>([])

// n:n 재구성 (2026-07-21): 구 find-first(모드당 1개만 표시 + 폼 소멸 = "한번 추가하면 끝")를
// 걷어내고 리스트/친구별 그룹으로 표출. 백엔드는 원래 친구별 N개 링크드 습관을 허용한다.
const soloTrackers = computed<HabitTrackerResponse[]>(() =>
  trackers.value.filter(tr => !tr.friendLinked && tr.status === 'ACTIVE'))

const friendTrackers = computed<HabitTrackerResponse[]>(() =>
  trackers.value.filter(tr => !!tr.friendLinked && tr.status === 'ACTIVE'))

// 친구 userId → 그 친구와의 활성 공동 습관 (친구쌍당 1개 — 백엔드 제약과 동일).
const trackerByFriend = computed<Map<string, HabitTrackerResponse>>(() => {
  const map = new Map<string, HabitTrackerResponse>()
  for (const tr of friendTrackers.value) {
    if (tr.friendUserId) map.set(tr.friendUserId, tr)
  }
  return map
})

// 그룹(친구별 대표 카드)에 선택되지 못한 연동 습관 전부 — 친구 목록에 없는 상대,
// friendUserId 미해석, 같은 친구의 중복 활성 트래커(과거 경쟁 데이터)까지 표출해
// 조용한 숨김을 막는다 (Codex R1 #11).
const orphanFriendTrackers = computed<HabitTrackerResponse[]>(() => {
  const known = new Set(friends.value.map(f => f.userId))
  return friendTrackers.value.filter((tr) => {
    if (!tr.friendUserId || !known.has(tr.friendUserId)) return true
    return trackerByFriend.value.get(tr.friendUserId) !== tr
  })
})

function openFriendForm(friendUserId: string) {
  // Codex R1 #7: 다른 친구의 생성 요청 진행 중 폼 전환 금지 — 성공 콜백의 close 가
  // 방금 연 폼의 입력을 지우는 유실 방지.
  if (creatingHabit.value) return
  friendFormFor.value = friendUserId
  friendHabitInput.value = ''
}

function closeFriendForm() {
  void dismissKeyboard()
  friendFormFor.value = null
  friendHabitInput.value = ''
}

function todayStr(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`
}

function checkedToday(tr: HabitTrackerResponse): boolean {
  return !!tr.lastCheckedDate && tr.lastCheckedDate.slice(0, 10) === todayStr()
}

async function submitSoloHabit() {
  const title = habitInput.value.trim()
  if (!title) {
    toast.error('습관 이름을 입력해주세요')
    return
  }
  if (creatingHabit.value) return
  void dismissKeyboard()
  creatingHabit.value = true
  try {
    const created = await createHabit(title, null)
    if (created) {
      toast.success(`'${title}' 습관을 시작했어요 🌱`)
      habitInput.value = ''
    }
    else {
      toast.error('습관 생성에 실패했어요')
    }
  }
  catch (e) {
    toast.error((e as Error).message ?? '습관 생성에 실패했어요')
  }
  finally {
    creatingHabit.value = false
  }
}

async function submitFriendHabit(friendUserId: string) {
  const title = friendHabitInput.value.trim()
  if (!title) {
    toast.error('습관 이름을 입력해주세요')
    return
  }
  if (creatingHabit.value) return
  void dismissKeyboard()
  creatingHabit.value = true
  try {
    // 서버가 friendUserId 를 수락된 invite 로 검증해 연동 — 양측 완주 시 반짝이 2배.
    const created = await createHabit(title, friendUserId)
    if (created) {
      toast.success(`'${title}' 함께 습관 시작! 친구에게 알림을 보냈어요 🤝`)
      // 제출한 친구의 폼이 여전히 열려 있을 때만 닫기 — 진행 중 다른 폼으로 전환된 경우
      // 그 입력을 지우지 않는다 (Codex R1 #7).
      if (friendFormFor.value === friendUserId) closeFriendForm()
    }
    else {
      toast.error('친구 함께 습관 생성 실패 — 수락된 친구인지 확인해주세요')
    }
  }
  catch (e) {
    toast.error((e as Error).message ?? '습관 생성에 실패했어요')
  }
  finally {
    creatingHabit.value = false
  }
}

async function onStopHabit(tr: HabitTrackerResponse) {
  const ok = await stopHabit(tr.id)
  if (ok) toast.success(`'${tr.title}' 습관을 중단했어요`)
  else toast.error('습관 중단에 실패했어요')
}

// ─── 습관 응원 (R3-FE) ───
// 친구 참여 대기(partnerActive=false) 습관 카드의 응원 버튼 → 팝업 → cheerHabit 전송.
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
    toast.success(`${target.friendNickname ?? '친구'} 에게 응원 메시지 전달 성공!`)
    cheerTarget.value = null
  }
  catch {
    toast.error('응원 전송에 실패했어요. 잠시 후 다시 시도해주세요')
  }
  finally {
    cheerBusy.value = false
  }
}

async function onCheckIn(tr: HabitTrackerResponse) {
  if (checkedToday(tr) || tr.status !== 'ACTIVE' || checkInBusy.value) return
  checkInBusy.value = true
  try {
    const result = await checkIn(tr.id)
    if (!result) {
      toast.error('체크인에 실패했어요')
      return
    }
    if (result.cycleCompleted && result.sparkleGranted > 0) {
      toast.success(`7일 완주! 반짝이 ${result.sparkleGranted}개 획득 ⭐`)
      await userStore.fetchMe(true) // 반짝이 지급 반영 — TTL 캐시 무시
    }
    else {
      toast.success('오늘 체크인 완료 ✓')
    }
  }
  catch (e) {
    toast.error((e as Error).message ?? '체크인에 실패했어요')
  }
  finally {
    checkInBusy.value = false
  }
}

// ─── 일상 기록 (모달) ───
type DailyModal = 'todo' | 'diary' | 'focus' | 'distance'
const openModal = ref<DailyModal | null>(null)

// 일상 기록 모달 4종의 focus trap + 배경 스크롤 잠금 + ESC + Android 뒤로가기는
// CommonBottomSheet 가 내장 처리한다(이중 등록 금지).
const submitting = ref<boolean>(false)
const pending = ref<boolean>(true)
const categories = ref<CategoryResponse[]>([])
// FE-10: 교체-대입 전용 리스트(로드/생성 모두 새 배열 재할당) — deep reactivity 불필요.
const recentRecords = shallowRef<RecordResponse[]>([])

// 아프젝 리스트 카드 — 파스텔 타일 배경 + 토큰 글리프/서브텍스트 색 (tailwind.css 토큰 참조)
const DAILY_CARDS: { title: string; token: string; accent: string; tileBg: string; modal: DailyModal }[] = [
  { title: '투두리스트 기록', token: '이슬토큰', accent: 'var(--color-apjek-dew)', tileBg: 'var(--color-apjek-dew-bg)', modal: 'todo' },
  { title: '일기 기록', token: '햇살토큰', accent: 'var(--color-apjek-sun)', tileBg: 'var(--color-apjek-sun-bg)', modal: 'diary' },
  { title: '집중 기록', token: '번개토큰', accent: 'var(--color-apjek-bolt)', tileBg: 'var(--color-apjek-bolt-bg)', modal: 'focus' },
  { title: '거리 기록', token: '바람토큰', accent: 'var(--color-apjek-wind)', tileBg: 'var(--color-apjek-wind-bg)', modal: 'distance' },
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
  // todo/diary 모달의 input/textarea 가 포커스를 유지한 채 즉시 unmount 되면 키보드가 안
  // 닫힐 수 있음 (utils/keyboard.ts 참조).
  void dismissKeyboard()
  openModal.value = null
}

// 공통 기록 저장 — dailyType 기준 보상 라우팅.
// 성공 시 서버가 실제 지급한 reward 를 함께 반환한다 — 토스트 문구가 이 값을 표시 (R4-FE).
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
      recentRecords.value = [created.record, ...recentRecords.value].slice(0, 5)
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

// 완료 토스트의 보상 문구 — 서버 응답 categoryTokens 를 동적 표시 (R4-FE).
// 응답에 값이 없으면(0/누락) 수치 없이 토큰명만 "획득!" 로 표기 — 실지급과 다른
// 거짓 숫자를 화면에 남기지 않는다.
function rewardText(tokenName: string, reward: RewardInfo | null): string {
  const n = reward?.categoryTokens
  return typeof n === 'number' && n > 0 ? `${tokenName}토큰 +${n}` : `${tokenName}토큰 획득!`
}

// ── 투두 모달 ──
// routineId: 루틴 프리필 출처 마커 (R1-FE) — 시트 재열기 시 중복 프리필 방지용. 저장 포맷은 불변.
interface TodoItem { id: string; text: string; checked: boolean; routineId?: number }
const todos = ref<TodoItem[]>([])
const todoNew = ref<string>('')
const todoAllChecked = computed<boolean>(() => todos.value.length > 0 && todos.value.every(t => t.checked))

// ── 투두 루틴 (R1-FE) — 목록 SoT 는 페이지가 소유, 변이는 RecordTodoRoutineManager 가 수행 ──
const routineOpen = ref<boolean>(false)
const todoRoutines = shallowRef<TodoRoutineResponse[]>([])

// 오늘 요일 해당 루틴(DAILY 전부 + WEEKLY 중 오늘 포함)을 미체크 항목으로 프리필.
// routineId 로 dedupe — 수기 항목과 공존하고, 시트 재열기 시 중복 추가를 막는다.
function prefillTodosFromRoutines(list: TodoRoutineResponse[]): void {
  const todayDow = new Date().getDay() // 0=일 ~ 6=토 (스키마 규약과 동일)
  const due = list.filter(r => r.repeatType === 'DAILY' || (r.daysOfWeek ?? []).includes(todayDow))
  const existing = new Set(todos.value.map(t => t.routineId).filter((v): v is number => v !== undefined))
  const added = due
    .filter(r => !existing.has(r.id))
    .map(r => ({ id: `routine-${r.id}`, text: r.label, checked: false, routineId: r.id }))
  // 수기 추가와 같은 30개 상한 — 기존 항목(앞쪽)을 보존하고 초과 프리필만 잘린다.
  if (added.length > 0) todos.value = [...todos.value, ...added].slice(0, 30)
}

// 시트 열림 시 루틴 로드 — 실패는 비차단(루틴 없이 기존 투두 동작 유지, 백엔드 미구현 404 포함).
async function loadTodoRoutines(): Promise<void> {
  try {
    const { data, error } = await sdk.listTodoRoutines({ client })
    if (error) return
    const list = castData<TodoRoutineListResponse>(data)?.routines ?? []
    todoRoutines.value = list
    prefillTodosFromRoutines(list)
  }
  catch {
    // 네트워크 예외 — 조용히 skip (매 열기마다 재시도됨)
  }
}

function onRoutineCreated(r: TodoRoutineResponse) {
  todoRoutines.value = [...todoRoutines.value, r]
  prefillTodosFromRoutines([r]) // 오늘 해당분이면 즉시 항목 반영
}

function onRoutineUpdated(r: TodoRoutineResponse) {
  todoRoutines.value = todoRoutines.value.map(x => (x.id === r.id ? r : x))
}

function onRoutineDeleted(routineId: number) {
  todoRoutines.value = todoRoutines.value.filter(x => x.id !== routineId)
  // 프리필된 미체크 항목은 유지한다 — 루틴은 항목의 "출처"일 뿐, 오늘 목록의 소유자가 아님.
}

function addTodo() {
  const text = todoNew.value.trim()
  if (!text) return
  if (todos.value.length >= 30) {
    toast.error('최대 30개까지 추가할 수 있어요')
    return
  }
  todos.value = [...todos.value, { id: `todo-${Date.now()}`, text, checked: false }]
  todoNew.value = ''
}

async function saveTodo() {
  if (!todoAllChecked.value) {
    toast.error('모든 항목을 체크해야 완료할 수 있어요')
    return
  }
  const note = todos.value.map(t => `✓ ${t.text}`).join('\n')
  const { ok, reward } = await saveDailyRecord('PHOTO', { note })
  if (ok) {
    toast.success(`투두리스트 완료! ${rewardText('이슬', reward)} 💧`)
    todos.value = []
    closeModal()
  }
}

// ── 일기 모달 ──
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
    toast.success(`일기가 저장되었어요! ${rewardText('햇살', reward)} ☀️`)
    diaryTitle.value = ''
    diaryText.value = ''
    photoUrl.value = ''
    closeModal()
  }
}

// ── 집중 모달 (타이머) ──
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
    toast.success(`집중 완료! ${rewardText('번개', reward)} ⚡ (${minutes}분)`)
    resetFocus()
    closeModal()
  }
}

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
    note: `${km}km`,
  })
  if (ok) {
    toast.success(`${km}km 기록! ${rewardText('바람', reward)} 🌬️`)
    resetDistance()
    closeModal()
  }
}

// 모달 전환 시 타이머/추적 정리 (누수 방지) + 투두 시트 열림 시 루틴 로드/프리필 (R1-FE).
watch(openModal, (next, prev) => {
  if (prev === 'focus' && next !== 'focus') resetFocus()
  if (prev === 'distance' && next !== 'distance') resetDistance()
  if (next === 'todo') void loadTodoRoutines()
  if (prev === 'todo' && next !== 'todo') routineOpen.value = false
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
    const [catRes, recRes, friRes] = await Promise.all([
      sdk.listCategories({ client }),
      sdk.listRecords({ client, query: { page: 0, size: 5 } }),
      sdk.listFriends({ client }),
    ])
    if (!catRes.error) {
      categories.value = castData<CategoryListResponse>(catRes.data)?.categories ?? []
    }
    if (!recRes.error) {
      recentRecords.value = castData<PagedRecordResponse>(recRes.data)?.content ?? []
    }
    if (!friRes.error) {
      friends.value = (castData<FriendInfo[]>(friRes.data) ?? []) as FriendInfo[]
    }
    // HTTP 에러(res.error)는 throw 하지 않아 조용히 빈 목록으로 위장되던 문제(audit C4-1) —
    // 하나라도 실패하면 에러 상태로 승격해 재시도 UI 를 보인다.
    if (catRes.error || recRes.error || friRes.error) {
      loadError.value = true
    }
  }
  catch {
    loadError.value = true
  }
  finally {
    // 실패해도 스켈레톤을 영구히 남기지 않는다.
    pending.value = false
  }
}

function retryInitial() {
  pending.value = true
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

