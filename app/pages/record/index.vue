<template>
  <div class="riso-grain min-h-screen space-y-[30px] pb-4">
    <!-- 헤더 -->
    <div class="flex items-center justify-between py-[10px]">
      <h1 class="font-bold text-[29px] text-black tracking-[-0.9px] leading-[28px]">
        기록하기
      </h1>
      <div class="flex items-center gap-[10px]">
        <button
          type="button"
          class="h-[40px] px-[12px] rounded-[16px] text-[12px] font-semibold"
          style="background: rgba(126,219,192,0.18); color: #3a9e78"
        >
          다이어리
        </button>
        <button
          type="button"
          class="h-[40px] px-[12px] rounded-[16px] text-[12px] font-semibold transition-all hover:opacity-80"
          style="background: rgba(126,219,192,0.18); color: #3a9e78"
          @click="navigateTo('/calendar')"
        >
          캘린더
        </button>
      </div>
    </div>

    <!-- ─── 습관 기록 ─── -->
    <div class="space-y-[16px]">
      <div>
        <h2 class="font-bold text-[18px] text-black tracking-[-0.44px] leading-[28px]">
          습관 기록
        </h2>
        <p class="text-[14px] text-[#525252] tracking-[-0.3px] leading-[20px] mt-[4px]">
          1주일동안 지정한 습관을 실천하고 반짝이를 획득해요
        </p>
      </div>

      <!-- 모드 선택 버튼 -->
      <div class="flex gap-[8px]">
        <button
          type="button"
          class="flex-1 h-[48px] rounded-[20px] flex items-center justify-center gap-[8px] transition-all active:scale-[0.97]"
          :style="mode === 'solo'
            ? { background: '#f092f0', boxShadow: '0 10px 7.5px rgba(0,0,0,0.1),0 4px 3px rgba(0,0,0,0.1)' }
            : { background: 'white', border: '1px solid rgba(0,0,0,0.1)' }"
          @click="mode = 'solo'"
        >
          <Icon name="lucide:sparkles" class="w-4 h-4" :style="{ color: mode === 'solo' ? 'white' : '#595757' }" />
          <span class="text-[14px] font-semibold" :style="{ color: mode === 'solo' ? 'white' : 'black' }">
            나의 습관 기록
          </span>
        </button>

        <button
          type="button"
          class="flex-1 h-[48px] rounded-[20px] flex items-center justify-center gap-[8px] transition-all active:scale-[0.97]"
          :style="mode === 'friend'
            ? { background: '#f092f0', boxShadow: '0 10px 7.5px rgba(0,0,0,0.1),0 4px 3px rgba(0,0,0,0.1)' }
            : { background: 'white', border: '1px solid rgba(0,0,0,0.1)' }"
          @click="mode = 'friend'"
        >
          <Icon name="lucide:users" class="w-4 h-4" :style="{ color: mode === 'friend' ? 'white' : 'black' }" />
          <span class="text-[14px] font-semibold" :style="{ color: mode === 'friend' ? 'white' : 'black' }">
            친구와 함께 기록
          </span>
        </button>
      </div>

      <!-- 습관 카드 -->
      <div class="flex flex-col items-center w-full">
        <!-- 로드 실패 -->
        <div v-if="habitsLoaded && habitLoadError" class="w-full text-center text-[13px] text-riso-poppy py-[24px]">
          습관을 불러오지 못했어요. 잠시 후 다시 시도해 주세요
          <button
            type="button"
            class="mt-[8px] block mx-auto text-[12px] font-semibold text-riso-sage underline"
            @click="loadHabits"
          >
            다시 시도
          </button>
        </div>

        <!-- 습관 생성 폼 (현재 모드에 활성 습관이 없을 때) -->
        <div v-else-if="!activeTracker" class="w-full">
          <div class="flex items-center justify-between w-full">
            <p class="text-[14px] font-bold text-black tracking-[-0.15px]">
              {{ mode === 'friend' ? '친구와 함께 습관 기록 생성' : '습관 기록 생성' }}
            </p>
            <button
              type="button"
              class="h-[32px] px-[10px] rounded-[12px] flex items-center gap-[6px] transition-all active:scale-95 hover:bg-gray-100 disabled:opacity-50"
              :disabled="creatingHabit"
              @click="submitHabit"
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

          <!-- 텍스트 입력 -->
          <div class="mt-[12px] w-full">
            <textarea
              v-model="habitInput"
              placeholder="1주일 동안 실천할 습관을 적어주세요"
              rows="3"
              maxlength="30"
              class="w-full rounded-[12px] p-[16px] text-[14px] resize-none outline-none leading-[20px] tracking-[-0.15px]"
              style="background: #f5f5f5; color: #111; min-height: 60px"
              @keydown.enter.exact.prevent="submitHabit"
            />
          </div>

          <!-- 친구 선택 (friend 모드) -->
          <div v-if="mode === 'friend'" class="pt-[10px] w-full flex flex-col gap-[10px]">
            <p class="text-[14px] text-[#525252] leading-[20px] tracking-[-0.3px]">
              함께 할 친구 선택
            </p>
            <div
              v-for="friend in friends"
              :key="friend.userId"
              class="w-full rounded-[12px] flex items-center gap-[12px] p-[12px]"
              style="background: #f9fafb"
            >
              <div
                class="size-[36px] rounded-full flex items-center justify-center text-[18px] shrink-0"
                style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)"
              >
                🌍
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[14px] font-semibold text-[#1e2939] leading-[20px] tracking-[-0.15px]">
                  {{ friend.nickname }}
                </p>
                <p class="text-[10px] text-[#99a1af] leading-[15px] tracking-[0.117px]">
                  TERRAWORLD 유저
                </p>
              </div>
              <button
                type="button"
                class="rounded-full px-[8px] py-[4px] text-[10px] font-semibold leading-[15px] tracking-[0.117px] transition-all active:scale-95 shrink-0"
                :style="selectedFriendId === friend.userId
                  ? { background: '#e5e7eb', color: '#9ca3af' }
                  : { background: 'black', color: 'white' }"
                @click="selectedFriendId = friend.userId"
              >
                {{ selectedFriendId === friend.userId ? '선택됨' : '선택' }}
              </button>
            </div>
            <div v-if="friends.length === 0" class="text-[12px] text-[#99a1af] text-center py-[8px]">
              함께 할 친구가 없어요.
              <NuxtLink to="/friends" class="text-riso-sage underline font-semibold">친구 초대하기</NuxtLink>
            </div>
          </div>
        </div>

        <!-- 습관 트래커 -->
        <template v-else>
          <div class="flex items-center justify-between w-full mb-[4px]">
            <p class="text-[14px] font-bold text-black tracking-[-0.15px]">
              {{ mode === 'friend' ? '입력한 습관' : activeTracker.title }}
            </p>
            <span
              class="text-[11px]"
              :style="{ color: activeTracker.status === 'ACTIVE' ? '#a0afd8' : '#f5a623' }"
            >
              {{ statusLabel(activeTracker.status) }}
            </span>
          </div>
          <p v-if="mode === 'friend'" class="w-full text-[13px] font-semibold text-black -mt-[2px] mb-[2px]">
            {{ activeTracker.title }}
            <span
              v-if="activeTracker.friendLinked"
              class="text-[10px] px-[6px] py-[2px] rounded-full ml-[4px]"
              style="background: rgba(240,146,240,0.15); color: #f092f0"
            >친구 연동 2배</span>
          </p>

          <!-- 7일 원 -->
          <div class="flex items-center justify-center gap-[12px] pt-[20px] pb-[4px]">
            <div
              v-for="hd in HABIT_DAYS"
              :key="hd.day"
              class="flex flex-col items-center gap-[4px]"
            >
              <div
                class="size-[36px] rounded-full flex items-center justify-center text-[12px] font-bold"
                :style="dayStyle(hd.day)"
              >
                {{ hd.day <= activeTracker.currentStreakDays ? '✓' : hd.day }}
              </div>
              <span
                class="text-[9px] tracking-[0.167px]"
                :style="{ color: hd.day <= activeTracker.currentStreakDays ? '#97a8f1' : '#c0c8e0' }"
              >
                {{ hd.points }}
              </span>
            </div>
          </div>

          <!-- 진행 바 -->
          <div class="w-full pt-[24px] pb-[20px]">
            <div class="flex items-start justify-between mb-[6px]">
              <span class="text-[10px] tracking-[0.117px] text-[#a0afd8]">
                진행 {{ activeTracker.currentStreakDays }}/{{ activeTracker.cycleLengthDays }}일
              </span>
              <span class="text-[10px] tracking-[0.117px] text-[#a0afd8]">
                7일 달성 시 반짝이 획득
              </span>
            </div>
            <div class="h-[6px] w-full rounded-full overflow-hidden" style="background: rgba(151,168,241,0.15)">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${Math.min(100, (activeTracker.currentStreakDays / activeTracker.cycleLengthDays) * 100)}%`,
                  background: 'linear-gradient(90deg,#97a8f1,#c4a0f0)',
                }"
              />
            </div>
          </div>

          <!-- 체크인 버튼 -->
          <button
            type="button"
            class="w-full h-[44px] rounded-[16px] text-[14px] font-semibold transition active:scale-95"
            :class="checkedToday(activeTracker) || activeTracker.status !== 'ACTIVE'
              ? 'bg-neutral-100 text-neutral-400 cursor-default'
              : 'bg-riso-sage text-white'"
            :disabled="checkedToday(activeTracker) || activeTracker.status !== 'ACTIVE' || checkInBusy"
            @click="onCheckIn(activeTracker)"
          >
            {{ checkinLabel(activeTracker) }}
          </button>
        </template>
      </div>
    </div>

    <!-- ─── 일상 기록 ─── -->
    <div class="space-y-[16px]">
      <div>
        <h2 class="font-bold text-[18px] text-black tracking-[-0.44px] leading-[28px]">
          일상 기록
        </h2>
        <p class="text-[14px] text-[#525252] tracking-[-0.3px] leading-[20px] mt-[4px]">
          다양한 방법으로 일상을 기록하고 토큰을 획득해요
        </p>
      </div>

      <!-- 2×2 카드 그리드 -->
      <div class="grid grid-cols-2 gap-[8px]">
        <button
          v-for="card in DAILY_CARDS"
          :key="card.title"
          type="button"
          class="h-[207px] rounded-[20px] flex flex-col items-center justify-center gap-[24px] p-[13px] text-center relative transition-all active:scale-[0.97]"
          :style="{ background: card.bg, border: '1px solid #fdf9e9' }"
          @click="openModal = card.modal"
        >
          <p class="text-[14px] font-semibold text-black leading-[16px]">
            {{ card.title }}
          </p>
          <div class="flex items-center justify-center">
            <!-- 투두 아이콘 -->
            <svg v-if="card.modal === 'todo'" width="13" height="19" fill="none" viewBox="0 0 13.0012 18.8869">
              <path :d="svgPaths.p2050f600" fill="#595757" />
              <path :d="svgPaths.p33366f00" fill="#595757" />
            </svg>
            <!-- 일기 아이콘 -->
            <svg v-else-if="card.modal === 'diary'" width="20" height="20" fill="none" viewBox="0 0 20 20">
              <g clip-path="url(#clip_diary)">
                <path :d="svgPaths.p16c5400" fill="#595757" />
                <path :d="svgPaths.p1278f00" fill="#595757" />
                <path :d="svgPaths.p1cdb9500" fill="#595757" />
                <path :d="svgPaths.p7f01a80" fill="#595757" />
                <path :d="svgPaths.p1bdb4e00" fill="#595757" />
                <path :d="svgPaths.p10744b00" fill="#595757" />
                <path :d="svgPaths.p4834b80" fill="#595757" />
                <path :d="svgPaths.p11269980" fill="#595757" />
                <path :d="svgPaths.p311b7500" fill="#595757" />
              </g>
              <defs><clipPath id="clip_diary"><rect fill="white" width="20" height="20" /></clipPath></defs>
            </svg>
            <!-- 집중 아이콘 -->
            <svg v-else-if="card.modal === 'focus'" width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path :d="svgPaths.p3a2fa580" stroke="#595757" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
            </svg>
            <!-- 거리 아이콘 -->
            <svg v-else width="17" height="14" fill="none" viewBox="0 0 17 14">
              <path :d="svgPaths.p11a72f00" fill="#595757" />
              <path :d="svgPaths.p1131d400" fill="#595757" />
            </svg>
          </div>
          <p class="text-[9px] text-black text-center leading-[16px]">
            {{ card.desc }}
          </p>
        </button>
      </div>

      <!-- 최근 기록 -->
      <div v-if="recentRecords.length > 0">
        <h3 class="font-bold mb-3 text-black text-[15px]">{{ $t('record.recentRecords') }}</h3>
        <div class="space-y-2">
          <RecordRecordCard
            v-for="record in recentRecords"
            :key="record.id"
            :record="record"
          />
        </div>
      </div>
    </div>

    <!-- ═══════ 일상기록 모달 (바텀시트) ═══════ -->

    <!-- 공통 백드롭 -->
    <Transition name="fade">
      <div
        v-if="openModal"
        class="fixed inset-0 bg-black/40 z-50"
        @click="onBackdrop"
      />
    </Transition>

    <!-- 투두 모달 -->
    <Transition name="sheet">
      <div
        v-if="openModal === 'todo'"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl shadow-2xl flex flex-col"
        style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); max-height: calc(100dvh - 98px)"
      >
        <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-xl">💧</span>
            <span class="font-bold text-base text-black">투두리스트 기록</span>
          </div>
          <button type="button" class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100" @click="closeModal">
            <Icon name="lucide:x" class="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div class="px-5 pt-3 pb-2 shrink-0">
          <div class="flex gap-2">
            <input
              v-model="todoNew"
              placeholder="새 항목 추가 (최대 30개)"
              class="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style="background: #f5f5f5"
              @keydown.enter="addTodo"
            >
            <button
              type="button"
              class="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-all active:scale-95"
              style="background: #7edbc0"
              @click="addTodo"
            >
              <Icon name="lucide:plus" class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto px-5 pb-2" style="min-height: 0">
          <div v-if="todos.length === 0" class="text-center py-8 text-gray-400">
            <div class="text-3xl mb-2">📋</div>
            <p class="text-sm">항목을 추가해보세요</p>
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="todo in todos"
              :key="todo.id"
              class="flex items-center gap-3 rounded-xl px-3 py-3 transition-all"
              :style="{ background: todo.checked ? 'rgba(126,219,192,0.08)' : '#f9fafb' }"
            >
              <button
                type="button"
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                :style="{ borderColor: todo.checked ? '#7edbc0' : '#d1d5db', background: todo.checked ? '#7edbc0' : 'transparent' }"
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
        <div class="px-5 pb-6 pt-2 shrink-0">
          <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{{ todos.filter(t => t.checked).length }}/{{ todos.length }} 완료</span>
            <span>완료 시 이슬토큰 +10 지급</span>
          </div>
          <button
            type="button"
            class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 disabled:opacity-40"
            :disabled="!todoAllChecked || submitting"
            :style="todoAllChecked
              ? { background: 'linear-gradient(135deg,#7edbc0,#52b388)', color: 'white' }
              : { background: '#f5f5f5', color: '#9ca3af' }"
            @click="saveTodo"
          >
            <Icon name="lucide:check" class="w-4 h-4" />
            {{ todoAllChecked ? '기록 완료 (+10 💧)' : '모든 항목 체크 후 완료 가능' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- 일기 모달 -->
    <Transition name="sheet">
      <div
        v-if="openModal === 'diary'"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl shadow-2xl flex flex-col"
        style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); max-height: calc(100dvh - 98px)"
      >
        <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">☀️</span>
            <span class="font-bold text-base text-black">일기 기록</span>
          </div>
          <button type="button" class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100" @click="closeModal">
            <Icon name="lucide:x" class="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" style="min-height: 0">
          <div class="text-xs text-gray-400 font-medium">{{ todayLongLabel }}</div>
          <input
            v-model="diaryTitle"
            placeholder="제목 (선택)"
            class="w-full text-[16px] font-bold border-b border-gray-100 pb-2 outline-none bg-transparent placeholder:text-gray-300"
          >
          <textarea
            v-model="diaryText"
            placeholder="오늘 하루를 기록해보세요..."
            rows="12"
            class="w-full flex-1 text-[14px] text-gray-700 leading-relaxed outline-none resize-none bg-transparent placeholder:text-gray-300"
          />
        </div>
        <div class="px-5 pb-6 pt-2">
          <div class="text-xs text-gray-400 text-center mb-2">저장 시 햇살토큰 +10 지급</div>
          <button
            type="button"
            class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95 disabled:opacity-50"
            style="background: linear-gradient(135deg,#f5d020,#f5a623)"
            :disabled="submitting"
            @click="saveDiary"
          >
            <Icon name="lucide:save" class="w-4 h-4" />저장하기
          </button>
        </div>
      </div>
    </Transition>

    <!-- 집중 모달 -->
    <Transition name="sheet">
      <div
        v-if="openModal === 'focus'"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl shadow-2xl"
        style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px)"
      >
        <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <span class="font-bold text-base text-black">집중 기록</span>
          </div>
          <button type="button" class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100" @click="closeModal">
            <Icon name="lucide:x" class="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div class="px-5 py-6 flex flex-col gap-4">
          <template v-if="focusPhase === 'setup'">
            <div>
              <label class="text-xs font-semibold text-gray-500 mb-1 block">타이머 이름</label>
              <input
                v-model="focusName"
                placeholder="예: 독서, 공부, 운동..."
                class="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style="background: #f5f5f5"
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
                class="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style="background: #f5f5f5"
              >
            </div>
            <div class="text-xs text-gray-400 text-center">완료 시 번개토큰 +10 지급</div>
            <button
              type="button"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95"
              style="background: linear-gradient(135deg,#667eea,#764ba2)"
              @click="startFocus"
            >
              <Icon name="lucide:play" class="w-4 h-4" />시작하기
            </button>
          </template>

          <div v-else class="flex flex-col items-center gap-6 py-4">
            <div class="text-lg font-bold text-gray-800">{{ focusName }}</div>
            <div class="relative size-40">
              <svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f5f5f5" stroke-width="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="#667eea" stroke-width="8"
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
              <div class="text-green-500 font-bold text-lg">🎉 집중 완료!</div>
              <button
                type="button"
                class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold disabled:opacity-50"
                style="background: linear-gradient(135deg,#56ab2f,#a8e063)"
                :disabled="submitting"
                @click="saveFocus(focusTotalSecs)"
              >
                <Icon name="lucide:zap" class="w-4 h-4" />기록 저장 (+10 ⚡)
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
      </div>
    </Transition>

    <!-- 거리 모달 -->
    <Transition name="sheet">
      <div
        v-if="openModal === 'distance'"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl shadow-2xl"
        style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px)"
      >
        <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌬️</span>
            <span class="font-bold text-base text-black">거리 기록</span>
          </div>
          <button type="button" class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100" @click="closeModal">
            <Icon name="lucide:x" class="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div class="px-5 py-8 flex flex-col items-center gap-6">
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
              <div class="text-xs text-gray-400 text-center">
                시작 후 이동하면 거리가 자동으로 측정돼요<br>완료 시 바람토큰 +10 지급
              </div>
              <button
                type="button"
                class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95"
                style="background: linear-gradient(135deg,#74b9ff,#0984e3)"
                @click="startDistance"
              >
                <Icon name="lucide:play" class="w-4 h-4" />측정 시작
              </button>
            </template>
            <button
              v-else-if="distPhase === 'tracking'"
              type="button"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white transition-all active:scale-95"
              style="background: linear-gradient(135deg,#fd79a8,#e84393)"
              @click="stopDistance"
            >
              <Icon name="lucide:stop-circle" class="w-4 h-4" />완료
            </button>
            <div v-else class="flex flex-col gap-2 w-full">
              <div class="text-center font-bold text-green-600 text-lg">측정 완료!</div>
              <button
                type="button"
                class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95 disabled:opacity-50"
                style="background: linear-gradient(135deg,#00b894,#00cec9)"
                :disabled="submitting"
                @click="saveDistance"
              >
                <Icon name="lucide:map-pin" class="w-4 h-4" />기록 저장 (+10 🌬️)
              </button>
              <button
                type="button"
                class="w-full h-10 rounded-2xl text-sm text-gray-400 border border-gray-100"
                @click="resetDistance"
              >
                다시 측정
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
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
  RecordResponse,
} from '@terraworld-it/openapi-frontend'
import { useUserStore } from '~/stores/user'
import svgPaths from './svg-paths'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()
const { trackRecordCreated } = useGtagEvents()
const userStore = useUserStore()
const { trackers, loaded: habitsLoaded, loadError: habitLoadError, load: loadHabits, create: createHabit, checkIn } = useHabits()

// ─── 습관 기록 상태 ───
type Mode = 'solo' | 'friend'
const mode = ref<Mode>('solo')
const habitInput = ref<string>('')
const selectedFriendId = ref<string | null>(null)
const creatingHabit = ref<boolean>(false)
const checkInBusy = ref<boolean>(false)
const friends = ref<FriendInfo[]>([])

const HABIT_DAYS: { day: number; points: string }[] = [
  { day: 1, points: '+10' },
  { day: 2, points: '+10' },
  { day: 3, points: '+30' },
  { day: 4, points: '+10' },
  { day: 5, points: '+10' },
  { day: 6, points: '+10' },
  { day: 7, points: '🎁' },
]

// 현재 모드에 해당하는 활성 트래커 (solo = 미연동 / friend = 연동).
const activeTracker = computed<HabitTrackerResponse | null>(() => {
  const list = trackers.value.filter(tr => tr.status !== 'COMPLETED')
  const match = list.find(tr => (mode.value === 'friend' ? !!tr.friendLinked : !tr.friendLinked))
  return match ?? null
})

function todayStr(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`
}

function checkedToday(tr: HabitTrackerResponse): boolean {
  return !!tr.lastCheckedDate && tr.lastCheckedDate.slice(0, 10) === todayStr()
}

function checkinLabel(tr: HabitTrackerResponse): string {
  if (tr.status === 'COMPLETED') return '완료된 습관'
  if (tr.status === 'BROKEN') return '연속 실패 — 다시 시작'
  if (checkedToday(tr)) return '오늘 완료 ✓'
  return '오늘 체크인'
}

function statusLabel(s: HabitTrackerResponse['status']): string {
  return s === 'ACTIVE' ? '진행중' : s === 'COMPLETED' ? '완료' : '중단'
}

function dayStyle(day: number): Record<string, string> {
  const tr = activeTracker.value
  const streak = tr?.currentStreakDays ?? 0
  const isChecked = day <= streak
  const isCurrent = !isChecked && day === streak + 1
  if (isChecked) return { background: 'linear-gradient(135deg,#97a8f1,#c4a0f0)', color: 'white' }
  if (isCurrent) return { background: 'rgba(151,168,241,0.15)', border: '2px dashed #97a8f1', color: '#97a8f1' }
  return { background: 'rgba(200,200,220,0.15)', border: '2px solid rgba(200,200,220,0.4)', color: '#c0c8e0' }
}

async function submitHabit() {
  const title = habitInput.value.trim()
  if (!title) {
    toast.error('습관 이름을 입력해주세요')
    return
  }
  if (mode.value === 'friend' && !selectedFriendId.value) {
    toast.error('함께 할 친구를 먼저 선택해주세요')
    return
  }
  if (creatingHabit.value) return
  creatingHabit.value = true
  // friend 모드 여부를 생성 전에 캡처(성공 후 mode 전환으로 값이 바뀔 수 있음).
  const wasFriendMode = mode.value === 'friend'
  try {
    // friend 모드: 선택한 친구 userId 전달 → 서버가 수락된 invite 로 검증해 연동(양측 완주 시 반짝이 2배, req3 #3).
    // solo 모드: friendUserId=null. 생성된 트래커는 friendLinked 상태라 현재 모드 뷰(activeTracker)에 그대로 노출.
    const created = await createHabit(title, wasFriendMode ? selectedFriendId.value : null)
    if (created) {
      toast.success(wasFriendMode
        ? `'${title}' 친구와 함께 습관을 시작했어요 🤝`
        : `'${title}' 습관을 시작했어요 🌱`)
      habitInput.value = ''
      selectedFriendId.value = null
    }
    else {
      toast.error(wasFriendMode
        ? '친구 함께 습관 생성 실패 — 수락된 친구인지 확인해주세요'
        : '습관 생성에 실패했어요')
    }
  }
  catch (e) {
    toast.error((e as Error).message ?? '습관 생성에 실패했어요')
  }
  finally {
    creatingHabit.value = false
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
      await userStore.fetchMe()
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
const submitting = ref<boolean>(false)
const categories = ref<CategoryResponse[]>([])
const recentRecords = ref<RecordResponse[]>([])

const DAILY_CARDS: { title: string; desc: string; bg: string; modal: DailyModal }[] = [
  { title: '투두리스트 기록', desc: '투두리스트를 기록하여 이슬토큰 획득', bg: '#fae9fd', modal: 'todo' },
  { title: '일기 기록', desc: '일기를 기록하여 햇살토큰 획득', bg: '#e9fdea', modal: 'diary' },
  { title: '집중 기록', desc: '타이머를 기록하여 번개토큰 획득', bg: '#fdfae9', modal: 'focus' },
  { title: '거리 기록', desc: '이동한 거리를 기록하여 바람토큰 획득', bg: '#e9ecfd', modal: 'distance' },
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

function onBackdrop() {
  // 진행 중인 타이머/추적이 있으면 백드롭 클릭으로 닫지 않음 (TW2 동작).
  if (openModal.value === 'focus' && focusPhase.value !== 'setup') return
  if (openModal.value === 'distance' && distPhase.value !== 'idle') return
  closeModal()
}

function closeModal() {
  openModal.value = null
}

// 공통 기록 저장 — dailyType 기준 보상 라우팅.
async function saveDailyRecord(dailyType: NonNullable<CreateRecordRequest['dailyType']>, opts: {
  duration?: number | null
  note?: string | null
  photoUrl?: string | null
}): Promise<boolean> {
  const categoryId = categoryIdFor(dailyType)
  if (categoryId === null) {
    toast.error('카테고리를 불러오지 못했어요')
    return false
  }
  if (submitting.value) return false
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
    if (created) {
      recentRecords.value = [created.record, ...recentRecords.value].slice(0, 5)
      const rew = created.reward
      trackRecordCreated({
        categoryId,
        categoryName: created.record.categoryName ?? '',
        basicCoins: rew.basicCoins,
        categoryTokens: rew.categoryTokens,
      })
      await userStore.fetchMe()
    }
    return true
  }
  catch (e) {
    toast.error((e as Error).message)
    return false
  }
  finally {
    submitting.value = false
  }
}

// ── 투두 모달 ──
interface TodoItem { id: string; text: string; checked: boolean }
const todos = ref<TodoItem[]>([])
const todoNew = ref<string>('')
const todoAllChecked = computed<boolean>(() => todos.value.length > 0 && todos.value.every(t => t.checked))

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
  const ok = await saveDailyRecord('PHOTO', { note })
  if (ok) {
    toast.success('투두리스트 완료! 이슬토큰 +10 💧')
    todos.value = []
    closeModal()
  }
}

// ── 일기 모달 ──
const diaryTitle = ref<string>('')
const diaryText = ref<string>('')

async function saveDiary() {
  const text = diaryText.value.trim()
  if (!text) {
    toast.error('일기 내용을 입력해주세요')
    return
  }
  const note = diaryTitle.value.trim() ? `${diaryTitle.value.trim()}\n${text}` : text
  const ok = await saveDailyRecord('DIARY', { note })
  if (ok) {
    toast.success('일기가 저장되었어요! 햇살토큰 +10 ☀️')
    diaryTitle.value = ''
    diaryText.value = ''
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
  const minutes = Math.round(durationSecs / 60)
  const ok = await saveDailyRecord('FOCUS', { duration: minutes, note: focusName.value })
  if (ok) {
    toast.success(`집중 완료! 번개토큰 +10 ⚡ (${minutes}분)`)
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
  clearDistWatch()
  distPhase.value = 'idle'
  distance.value = 0
  distElapsed.value = 0
  distError.value = ''
  distPrev = null
}

function startDistance() {
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
  distWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const curr = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      if (distPrev) {
        const d = haversine(distPrev, curr)
        if (d < 50) distance.value += d
      }
      distPrev = curr
    },
    (err) => {
      distError.value = `위치 오류: ${err.message}`
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 },
  )
}

function stopDistance() {
  clearDistWatch()
  distPhase.value = 'done'
}

async function saveDistance() {
  const km = (distance.value / 1000).toFixed(2)
  const ok = await saveDailyRecord('DISTANCE', {
    duration: Math.round(distElapsed.value / 60),
    note: `${km}km`,
  })
  if (ok) {
    toast.success(`${km}km 기록! 바람토큰 +10 🌬️`)
    resetDistance()
    closeModal()
  }
}

// 모달 전환 시 타이머/추적 정리 (누수 방지).
watch(openModal, (next, prev) => {
  if (prev === 'focus' && next !== 'focus') resetFocus()
  if (prev === 'distance' && next !== 'distance') resetDistance()
})

onBeforeUnmount(() => {
  clearFocusTimer()
  clearDistWatch()
})

// ─── 초기 로드 ───
async function loadInitial() {
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
  }
  catch (e) {
    toast.error((e as Error).message)
  }
}

onMounted(() => {
  loadInitial()
  loadHabits()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translate(-50%, 100%);
}
</style>
