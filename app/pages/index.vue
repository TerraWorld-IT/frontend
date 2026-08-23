<!--
  홈 화면 — 아프젝 v2 '나의 테라' (2026-08-21 Figma 갱신본 기준, gap-plan §3.2 T1b/T2/T3b/T4b/T7b/T8/T10/T10b/T11/T12/T13/T14/T15).
  구조: 상단 원형 메뉴바 5종 상시(랭킹/공유하기/출석체크/광고보상/알림) + "나의 테라" 타이틀
  + 병 캐러셀(현재 병 / Lv.2 / Lv.3 카드 + 도트) + [힐링 모드][관리 모드] 필 + 아코디언(친구 목록 → 보유 재화, 기본 열림).
  상단 메뉴의 랭킹/출석/알림은 페이지 이동 없이 홈 위 팝업(랭킹 팝업 / 출석 팝업 / 우측 알림 패널)으로 연다.
  실 데이터 배선은 기존 그대로: getMe / getTerrarium / listItems / listFreePlacements 병렬 로드,
  하트(clickTerrariumHeart) / 광고보상(claimAdReward) / 출석(useAttendance) / 공유(html2canvas)
  / 자유배치 드래그(updateFreePosition) / 티어(useTier) 실 API. scale/flip/zIndex 는 서버 영속.
  관리 모드 = 인트로 스플래시 → 상단 칩 3종 + 하단 고정 패널 + [저장하기]. 힐링 모드 = 인트로 → 풀블리드 + 상단 필바(BGM/X).
-->
<template>
  <!-- 루트 — 레이아웃 main 의 px-5/pt 를 음수 마진으로 상쇄해 상단 그라디언트를 풀블리드로 편다.
       (main 의 pt 는 calc(1rem + safe-area) — -mt-4 는 1rem 몫만 상쇄해 세이프에어리어는 유지)
       관리 모드에선 하단 고정 패널 높이만큼 여백을 더해 병이 패널 뒤로 숨지 않게 한다. -->
  <div
    class="flex flex-col gap-5 min-h-screen -mx-5 -mt-4 px-5 pt-4"
    :class="editMode ? 'pb-[300px]' : 'pb-6'"
    style="background: linear-gradient(180deg, var(--color-apjek-blue-soft) 0%, var(--color-apjek-surface) 55%)"
  >
    <!-- Loading -->
    <CommonLoading v-if="pending" variant="skeleton" container-class="py-8" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">{{ $t('common.loadFail') }}</p>
      <p class="text-xs text-apjek-text-sub">{{ $t('common.loadFailDesc') }}</p>
      <button
        class="mt-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold"
        style="background: var(--color-apjek-blue)"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- Main -->
    <template v-else>
      <!-- ─── T7b 상단 원형 메뉴바 5종 상시 노출 (관리 모드에선 칩으로 대체) ─── -->
      <div
        v-if="!editMode"
        class="mx-auto w-full max-w-[400px] rounded-full px-2 py-2 flex items-center justify-evenly"
        style="background: color-mix(in srgb, var(--color-apjek-blue) 10%, transparent)"
      >
        <!-- 랭킹 → 랭킹 팝업 (T5, 보유 아이템 수 기준 전체/친구) -->
        <button type="button" data-testid="home-ranking" class="menu-item" aria-label="랭킹" @click="showRanking = true">
          <span class="menu-circle"><Icon name="lucide:trophy" class="w-5 h-5" /></span>
          <span class="menu-label">랭킹</span>
        </button>
        <!-- 공유하기 → 공유 모달 (T10) -->
        <button type="button" data-testid="home-share" class="menu-item" aria-label="공유하기" @click="showShareDialog = true">
          <span class="menu-circle"><Icon name="lucide:share-2" class="w-5 h-5" /></span>
          <span class="menu-label">공유하기</span>
        </button>
        <!-- 출석체크 → 기존 출석 팝업 (오늘 완료 시 ✓ 표시 유지) -->
        <button type="button" data-testid="home-attendance" class="menu-item" aria-label="출석체크" @click="showAttendance = true">
          <span class="menu-circle">
            <Icon name="lucide:calendar" class="w-5 h-5" />
            <span
              v-if="alreadyCheckedToday"
              class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border border-white text-[8px] flex items-center justify-center text-white"
            >✓</span>
          </span>
          <span class="menu-label">출석체크</span>
        </button>
        <!-- 광고보상 — 상시 노출(T7b, §4 N-3). 실 광고 가용 플랫폼(Android 네이티브/dev)에서만 팝업,
             웹/비지원 환경은 탭 시 안내 토스트(광고 없이 보상만 청구되던 fail-open 진입점은 계속 차단). -->
        <button
          type="button"
          data-testid="home-freecoin"
          class="menu-item"
          :aria-label="$t('home.ariaFreeCoin')"
          @click="onAdMenuClick"
        >
          <span class="menu-circle"><Icon name="lucide:gift" class="w-5 h-5" /></span>
          <span class="menu-label">광고보상</span>
        </button>
        <!-- 알림 (T1b) — 우측 슬라이드 패널 + 미읽음 마젠타 점 뱃지 #FF2BA7 13px (마운트 시 1회 조회, 실패 시 숨김).
             lucide:bell 은 clientBundle 미등재라 인라인 SVG 사용. -->
        <button type="button" data-testid="home-notify" class="menu-item" aria-label="알림" @click="onNotifyClick">
          <span class="menu-circle">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span
              v-if="notifyUnread > 0"
              class="absolute -top-1 -right-1 w-[13px] h-[13px] rounded-full border border-white"
              style="background: #FF2BA7"
              data-testid="home-notify-badge"
            />
          </span>
          <span class="menu-label">알림</span>
        </button>
      </div>

      <!-- ─── T11 타이틀 "나의 테라" (댓글 #1 크기 조정 24px/800) ─── -->
      <h1 v-if="!editMode" class="text-center text-[24px] font-extrabold text-apjek-text tracking-[-0.5px]">나의 테라</h1>

      <!-- ─── T13 관리 모드 상단 칩 3종 [🌱 아이템 배치][정령][✏️ 배경 설정] (선택 칩 파랑 채움) ─── -->
      <div v-else class="flex justify-center gap-2 flex-wrap" role="tablist" aria-label="관리 모드 탭">
        <button
          v-for="chip in manageChips"
          :key="chip.tab"
          type="button"
          role="tab"
          :data-testid="`home-manage-${chip.tab}`"
          class="h-10 flex items-center gap-1.5 px-4 rounded-full transition-all active:scale-95 text-xs font-semibold whitespace-nowrap"
          :style="manageTab === chip.tab
            ? { background: 'var(--color-apjek-blue)', color: '#ffffff' }
            : { background: 'var(--color-apjek-surface)', color: 'var(--color-apjek-text-sub)', border: '1px solid var(--color-apjek-border-strong)' }"
          :aria-selected="manageTab === chip.tab"
          @click="manageTab = chip.tab"
        >
          <span v-if="chip.icon" aria-hidden="true">{{ chip.icon }}</span>{{ chip.label }}
        </button>
      </div>

      <!-- ─── T14 병 캐러셀: Lv.1/2/3 레벨당 한 장 — 활성 병 레벨은 스테이지(slot), 나머지는 전환/해금 카드 ─── -->
      <TerrariumJarCarousel
        :levels="jarLevels"
        :selected-level="viewLevel"
        :locked="editMode || healingMode"
        @unlock="onUnlockRequest"
        @select="onSelectLevel"
      >
        <!-- ─── 유리병 스테이지 (힐링 모드 시 풀블리드 오버레이로 승격) — 캐러셀이 활성 레벨 슬라이드에 배치 ─── -->
        <!-- 스테이지는 항상 설계 기준 400×552 를 유지(shrink-0)하고 uniform scale 로 화면에 맞춘다.
             이전에는 flex 축소로 스테이지 폭만 줄어(예: 376px) %-inset 병 아트는 세로로 왜곡되고
             px 좌표계(편집존·아이템 x/y·posX 저장 /400)와 기준이 어긋났다 (2026-07-20 라이브 실측). -->
        <div
          id="my-terra-container"
          ref="stageEl"
          :class="healingMode
            ? 'fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[9990] flex flex-col items-center justify-center overflow-hidden'
            : 'relative flex justify-center items-center w-full overflow-hidden'"
          :style="healingMode
            ? { background: 'linear-gradient(180deg, #cfe0f6 0%, #eef5ff 55%, #ffffff 100%)' }
            : { cursor: editMode ? 'default' : 'grab', paddingTop: '1.3rem', paddingBottom: '1.3rem', minHeight: viewScale < 1 ? '380px' : undefined }"
          @wheel="onWheel"
        >
          <div
            class="transition-transform duration-200 ease-out relative shrink-0"
            :style="{
              transform: `scale(${zoomLevel * stageFit * viewScale})`,
              transformOrigin: 'top center',
              width: '400px',
              height: '552px',
              marginBottom: `${-552 * (1 - stageFit * viewScale)}px`,
            }"
          >
            <!-- 병 뒤 원형 글로우 — 설정된 배경(BACKGROUND 아이템)이 URL 에셋이면 글로우 원 안에 배경 레이어로 렌더(T13),
                 없으면 기존 라디얼 하이라이트. inline transform 이라 Tailwind translate 유틸과의 이중 적용 함정 없음. -->
            <div
              class="absolute pointer-events-none rounded-full overflow-hidden"
              :style="{ left: '50%', top: '52%', width: `${backdropSize}px`, height: `${backdropSize}px`, transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 56%, rgba(255,255,255,0) 70%)' }"
              data-testid="home-jar-backdrop"
            >
              <img
                v-if="backgroundImageUrl"
                :src="backgroundImageUrl"
                alt=""
                class="absolute inset-0 w-full h-full object-cover"
                style="opacity: 0.85; mask-image: radial-gradient(circle, #000 0%, #000 60%, transparent 72%); -webkit-mask-image: radial-gradient(circle, #000 0%, #000 60%, transparent 72%)"
                draggable="false"
                @error="backgroundImageFailed = true"
              >
            </div>

            <!-- 유리병 (Figma Jar1 픽셀-정확) -->
            <div class="absolute inset-0">
              <IconsJar1 />
            </div>

            <!-- 시들기 CTA (낙서장 기능 유지, 시각 최소) -->
            <TerrariumWiltingOverlay v-if="terrarium?.wilting && terrarium.wilting.stage > 0" :state="terrarium.wilting" />

            <!-- 편집모드 안내 영역 -->
            <Transition name="edit-fade">
              <div
                v-if="editMode"
                class="absolute z-20 pointer-events-none rounded-xl"
                :style="{
                  left: `${JAR.minX}px`,
                  top: `${JAR.minY + 60}px`,
                  width: `${JAR.maxX - JAR.minX}px`,
                  height: `${JAR.maxY - JAR.minY - 60}px`,
                  border: '2px dashed rgba(81,140,219,0.55)',
                  background: 'rgba(81,140,219,0.04)',
                }"
              >
                <!-- 빈 병 첫 편집 안내 — 배치 아이템이 없으면 다음 행동(하단 패널 타일 탭)을 알려준다. -->
                <p
                  v-if="placedItems.length === 0 && manageTab === 'items'"
                  class="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-[13px] font-semibold rounded-xl px-3 py-2 mx-auto w-fit"
                  style="color: var(--color-apjek-blue-deep); background: rgba(255,255,255,0.82)"
                >
                  아래 '보유 아이템 목록'에서<br>첫 아이템을 배치해 보세요
                </p>
              </div>
            </Transition>

            <!-- 배치된 아이템들 (자유배치) -->
            <div
              v-for="placed in placedItems"
              :key="placed.placementId"
              class="absolute flex items-center justify-center select-none touch-none"
              :class="animClass(placed)"
              :style="itemStyle(placed)"
              @pointerdown="(e) => onItemPointerDown(e, placed)"
              @click="onItemClick(placed)"
            >
              <!-- 아이템 본체 -->
              <div
                class="relative flex items-center justify-center"
                :style="{ transform: `scale(${placed.scale}) scaleX(${placed.flipped ? -1 : 1})`, transformOrigin: 'center' }"
              >
                <img
                  v-if="isUrl(placed.image)"
                  :src="placed.image"
                  :alt="placed.name"
                  class="w-11 h-11 object-contain pointer-events-none"
                  draggable="false"
                >
                <div v-else class="text-4xl pointer-events-none">{{ placed.image }}</div>
                <Icon
                  v-if="placed.isAnimated && !editMode"
                  name="lucide:sparkles"
                  class="w-3 h-3 text-yellow-400 absolute -top-1 -right-1 pointer-events-none"
                />
              </div>

              <!-- 편집 모드 선택 시 핸들/버튼 -->
              <template v-if="editMode && selectedItemId === placed.placementId">
                <!-- 선택 테두리 -->
                <div
                  class="absolute pointer-events-none rounded-lg"
                  :style="{
                    left: `${HALF - visualHalf(placed) - 2}px`,
                    top: `${HALF - visualHalf(placed) - 2}px`,
                    width: `${visualHalf(placed) * 2 + 4}px`,
                    height: `${visualHalf(placed) * 2 + 4}px`,
                    border: '1.5px dashed rgba(81,140,219,0.75)',
                  }"
                />

                <!-- 오른쪽 버튼 그룹 (앞으로/뒤로/반전/삭제) -->
                <button
                  v-for="btn in itemButtons(placed)"
                  :key="btn.label"
                  type="button"
                  :title="btn.label"
                  class="absolute flex items-center justify-center rounded-full shadow-lg text-white z-30 transition-transform active:scale-90"
                  :style="{
                    left: `${HALF + visualHalf(placed) + 6}px`,
                    top: `${btn.offsetY}px`,
                    width: '24px',
                    height: '24px',
                    background: btn.bg,
                  }"
                  @pointerdown.stop
                  @click.stop="btn.onClick()"
                >
                  <Icon :name="btn.icon" class="w-3 h-3" />
                </button>

                <!-- 4모서리 리사이즈 핸들 -->
                <div
                  v-for="c in corners(placed)"
                  :key="c.key"
                  class="absolute z-30 rounded-full bg-white shadow-md border-2"
                  :style="{
                    left: `${HALF + c.ox - HANDLE / 2}px`,
                    top: `${HALF + c.oy - HANDLE / 2}px`,
                    width: `${HANDLE}px`,
                    height: `${HANDLE}px`,
                    cursor: c.cursor,
                    borderColor: '#518cdb',
                    touchAction: 'none',
                  }"
                  @pointerdown="(e) => onCornerPointerDown(e, placed, c.dirX, c.dirY)"
                />
              </template>
            </div>

            <!-- 하트 버튼 (편집모드 숨김 — 힐링 모드에선 유지) -->
            <div v-show="!editMode" class="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                type="button"
                data-testid="home-heart"
                class="relative transition-transform active:scale-90 hover:scale-110 disabled:opacity-50"
                :disabled="heartBusy"
                :aria-label="$t('home.ariaHeart')"
                @click="onHeartClick"
              >
                <Icon name="lucide:heart" class="w-8 h-8 fill-[#f092f0] text-[#f092f0]" />
                <span
                  v-for="f in heartFloats"
                  :key="f.id"
                  class="heart-float absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1 font-bold"
                  style="color: #f092f0"
                >
                  <Icon name="lucide:star" class="w-4 h-4" style="color: #f092f0" />
                  <span class="text-base">+0.1</span>
                </span>
              </button>
            </div>
          </div>

          <!-- ─── T3b/T2 힐링 모드 상단 필바 409×44 — 좌 음표 원형 토글(ON 파랑/OFF 회색 슬래시), 우 X 원형 ─── -->
          <div
            v-if="healingMode"
            class="absolute left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[409px] h-11 rounded-full flex items-center justify-between px-1.5"
            :style="{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))', background: 'rgba(255,255,255,0.88)', border: '1px solid var(--color-apjek-border)' }"
            data-testid="home-healing-bar"
          >
            <button
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
              :style="bgm.enabled.value
                ? { background: 'var(--color-apjek-blue)', color: '#ffffff' }
                : { background: 'var(--color-apjek-bg)', color: 'var(--color-apjek-text-faint)' }"
              :aria-label="bgm.enabled.value ? '음악 끄기' : '음악 켜기'"
              :aria-pressed="bgm.enabled.value"
              data-testid="home-bgm-toggle"
              @click="onToggleBgm"
            >
              <Icon v-if="bgm.enabled.value" name="lucide:music" class="w-4 h-4" />
              <Icon v-else name="lucide:volume-x" class="w-4 h-4" />
            </button>
            <span class="text-xs font-semibold text-apjek-text-sub">{{ bgm.enabled.value ? '음악 ON' : '음악 OFF' }}</span>
            <button
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
              style="background: var(--color-apjek-blue-soft)"
              aria-label="힐링 모드 닫기"
              data-testid="home-healing-close"
              @click="healingMode = false"
            >
              <Icon name="lucide:x" class="w-4 h-4" style="color: var(--color-apjek-blue)" />
            </button>
          </div>
        </div>
      </TerrariumJarCarousel>

      <!-- ─── T3 모드 필: 힐링/관리 (일반) — 관리 모드 중엔 하단 패널의 [저장하기]가 종료 동작 ─── -->
      <div v-if="!editMode" class="flex justify-center gap-3">
        <button
          type="button"
          data-testid="home-healing"
          class="mode-pill"
          style="background: #def259; color: #4c5514"
          @click="enterHealingMode"
        >
          <Icon name="lucide:sprout" class="w-4 h-4" />힐링 모드
        </button>
        <button
          type="button"
          data-testid="home-manage"
          class="mode-pill"
          style="background: #bcdadd; color: #2f5f63"
          @click="enterManageMode()"
        >
          <Icon name="lucide:pencil" class="w-4 h-4" />관리 모드
        </button>
      </div>

      <!-- ─── T4b 아코디언: 친구 목록 → 보유 재화 (기본 열림, 접으면 기억 — 관리 모드에선 숨김) ─── -->
      <template v-if="!editMode">
        <TerrariumHomeAccordion v-model:open="friendsOpen" title="친구 목록" icon="lucide:users">
          <div class="px-4 pb-4 flex flex-col gap-2">
            <div v-if="homeFriendsLoading" class="rounded-xl bg-gray-50 p-3 text-center">
              <p class="text-xs text-apjek-text-faint">친구 목록 불러오는 중…</p>
            </div>
            <template v-else-if="homeFriends.length > 0">
              <div
                v-for="friend in homeFriends"
                :key="friend.userId"
                class="rounded-xl bg-gray-50 flex items-center gap-3 p-3"
              >
                <div class="size-9 rounded-full flex items-center justify-center text-lg shrink-0" style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)">🌍</div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-apjek-text truncate">{{ friend.nickname }}</p>
                  <p class="text-[10px] text-apjek-text-faint tracking-[0.1px]">TERRAWORLD 유저</p>
                </div>
                <!-- T15 놀러가기 — 방문 모달 직접 오픈 (friends 페이지와 동일 API) -->
                <button
                  type="button"
                  class="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shrink-0 disabled:opacity-50"
                  style="background: var(--color-apjek-cta)"
                  :disabled="visitingId !== null"
                  :data-testid="`home-visit-${friend.userId}`"
                  @click="onVisitFriend(friend)"
                >놀러가기</button>
              </div>
            </template>
            <div v-else class="rounded-xl bg-gray-50 flex items-center justify-between gap-3 p-3">
              <p class="text-xs text-apjek-text-faint">{{ homeFriendsError ? '친구 목록을 불러오지 못했어요' : '아직 함께하는 친구가 없어요' }}</p>
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shrink-0"
                style="background: var(--color-apjek-cta)"
                @click="navigateTo('/friends')"
              >{{ homeFriendsError ? '친구 페이지로' : '친구 초대하기' }}</button>
            </div>
          </div>
        </TerrariumHomeAccordion>

        <TerrariumHomeAccordion v-model:open="walletOpen" title="보유 재화" icon="lucide:circle-dollar-sign">
          <div class="px-4 pb-4 flex flex-col gap-2">
            <!-- T12 재화 환전 — 상점/더보기와 동일 다이얼로그 재사용 (댓글 #18/#47) -->
            <button
              type="button"
              data-testid="home-exchange"
              class="apjek-cta w-full py-2.5 text-sm"
              @click="showExchange = true"
            >
              <span aria-hidden="true">⇄</span> 재화 환전
            </button>
            <!-- 활동 토큰 4종 (이슬/햇살/번개/바람) — Figma: 아이콘 위 + 값 (타일 배경 없음) -->
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="c in tokenCurrencies"
                :key="c.code"
                class="flex flex-col items-center gap-1"
              >
                <IconsCurrencyIcon :code="c.code" :size="36" />
                <span class="text-[11px] text-apjek-text-sub whitespace-nowrap">{{ c.labelKo }}토큰</span>
                <span class="text-[13px] font-bold text-apjek-text">{{ formatBalance(balanceOf(user?.currency, c.code)) }}</span>
              </div>
            </div>
            <!-- 코인류 3종 (코인/반짝이/루비) — 아이콘 좌측 + 라벨/값 -->
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="c in mainCurrencies"
                :key="c.code"
                class="flex items-center gap-2 min-w-0"
              >
                <IconsCurrencyIcon :code="c.code" :size="36" />
                <div class="min-w-0">
                  <p class="text-[11px] text-apjek-text-sub leading-[14px] truncate">{{ c.labelKo }}</p>
                  <p class="text-[14px] font-bold text-apjek-text leading-[18px]">{{ formatBalance(balanceOf(user?.currency, c.code)) }}</p>
                </div>
              </div>
            </div>
          </div>
        </TerrariumHomeAccordion>
      </template>
    </template>
  </div>

  <!-- ═══════════════ T13 관리 모드 하단 고정 패널 (보유 아이템/정령/배경 목록 + 저장하기) ═══════════════ -->
  <TerrariumManagePanel
    :open="editMode"
    :tab="manageTab"
    :tiles="manageTiles"
    :busy="placementBusy || backgroundBusy"
    :saving="saving"
    :max-slots="maxSlots"
    :placed-count="placedItems.length"
    :empty-cta-label="manageEmptyCta"
    @tile="onManageTile"
    @save="onSaveManage"
    @empty-cta="onManageEmptyCta"
  />

  <!-- ═══════════════ T3b/T13 모드 진입 인트로 스플래시 1.2초 ═══════════════ -->
  <TerrariumModeIntro
    :open="introMode === 'healing'"
    icon="🌱"
    title="힐링 모드"
    description="나의 테라를 천천히 감상해보세요"
    @done="onHealingIntroDone"
  />
  <TerrariumModeIntro
    :open="introMode === 'manage'"
    icon="✏️"
    title="관리 모드"
    description="아이템으로 테라리움을 꾸미고 레벨과 아이템을 관리해요"
    @done="onManageIntroDone"
  />

  <!-- ═══════════════ T10 공유하기 모달 (SNS/이미지 저장/초대코드 3행 + 인스타 4행 유지) ═══════════════ -->
  <TerrariumShareModal
    :open="showShareDialog"
    :busy="capturingImage"
    :invite-creating="inviteCreating"
    :story-share-available="storyShareAvailable"
    @close="showShareDialog = false"
    @sns="onSnsShare"
    @save="onImageSave"
    @invite="onInviteShare"
    @story="onInstagramStoryShare"
  />

  <!-- ═══════════════ T5 랭킹 팝업 (보유 아이템 수 — 전체/친구 세그먼트, 내부 스크롤) ═══════════════ -->
  <TerrariumRankingModal :open="showRanking" :nickname="user?.nickname ?? ''" @close="showRanking = false" />

  <!-- ═══════════════ T1b 알림 패널 (우측 슬라이드인, 읽음 성공 시 뱃지 클리어) ═══════════════ -->
  <NotificationsCenter :open="showNotifications" @close="showNotifications = false" @read="notifyUnread = 0" />

  <!-- ═══════════════ T10b 나의 초대코드 팝업 (실제 발급 코드 그대로, 표기만 TERRA - 코드) ═══════════════ -->
  <TerrariumInviteCodeModal
    :open="showInviteCode"
    :code="inviteCode"
    :inviter-ruby="inviteInviterRuby"
    :invitee-ruby="inviteInviteeRuby"
    @close="showInviteCode = false"
    @copy="onCopyInviteCode"
    @share="onShareInviteCode"
  />

  <!-- ═══════════════ T14 해금 팝업 / 해금 성공 팝업 ═══════════════ -->
  <TerrariumTierUnlockModal
    :open="unlockTarget !== null"
    :target="unlockTarget"
    :ruby-balance="rubyBalance"
    :busy="unlockBusy"
    :success="unlockSuccess"
    @close="closeUnlockModal"
    @unlock="onUnlockConfirm"
    @manage="onUnlockManage"
  />

  <!-- ═══════════════ T15 친구 방문 모달 (friends 페이지와 동일 컴포넌트/핸들러) ═══════════════ -->
  <FriendsVisitModal
    :open="visitModalOpen"
    :friend="visitFriend"
    :terrarium="visitTerrarium"
    :liking="likingId !== null"
    @close="visitModalOpen = false"
    @toggle-like="visitFriend && onToggleLike(visitFriend)"
  />

  <!-- ═══════════════ T12 재화 환전 다이얼로그 (상점 컴포넌트 재사용) ═══════════════ -->
  <ShopExchangeDialog v-model="showExchange" />

  <!-- ═══════════════ T6 출석체크 팝업 — Figma "출석 체크 팝업" 3종(출석 전 / 오늘 완료 / 7일 완료). 보드·보상은 서버 AttendanceResponse 그대로 ═══════════════ -->
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="showAttendance" ref="attendanceRoot" class="fixed inset-0 z-[9997]" role="dialog" aria-modal="true" aria-label="출석체크">
        <div class="fixed inset-0 bg-black/40" @click="showAttendance = false" />
        <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto">
          <div class="rounded-3xl p-6 shadow-2xl" style="background: rgba(255,255,255,0.96); backdrop-filter: blur(20px)" data-testid="attendance-popup">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: var(--color-apjek-blue-soft)">
                  <Icon name="lucide:calendar" class="w-5 h-5" style="color: var(--color-apjek-blue)" />
                </div>
                <div>
                  <h3 class="font-bold text-base" style="color: #111111">출석체크</h3>
                  <p class="text-[10px]" style="color: #a1a1a1" data-testid="attendance-subtitle">{{ attendanceSubtitle }}</p>
                </div>
              </div>
              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center"
                style="background: var(--color-apjek-blue-soft)"
                aria-label="닫기"
                @click="showAttendance = false"
              >
                <Icon name="lucide:x" class="w-4 h-4" style="color: var(--color-apjek-blue)" />
              </button>
            </div>
            <!-- 7일 보드 — board[] 순서대로 1~7 원형 + "+코인N" 라벨, 수령한 칸은 체크 -->
            <div class="flex justify-center gap-3 mb-6" data-testid="attendance-board">
              <div v-for="cell in attendanceBoard" :key="`att-day-${cell.day}`" class="flex flex-col items-center gap-1">
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center"
                  :style="{
                    background: cell.claimed
                      ? 'var(--color-apjek-blue)'
                      : attDotCurrent(cell.day) ? 'var(--color-apjek-blue-soft)' : 'rgba(200,200,220,0.15)',
                    border: cell.claimed
                      ? 'none'
                      : attDotCurrent(cell.day) ? '2px dashed #518cdb' : '2px solid rgba(200,200,220,0.4)',
                  }"
                >
                  <Icon v-if="cell.claimed" name="lucide:check-circle-2" class="w-5 h-5 text-white" />
                  <span v-else class="text-xs font-bold" :style="{ color: attDotCurrent(cell.day) ? '#518cdb' : '#c0c8e0' }">{{ cell.day }}</span>
                </div>
                <span class="text-[9px] whitespace-nowrap" :style="{ color: cell.claimed ? '#518cdb' : '#c0c8e0' }">+코인{{ cell.rewardBasicCoins }}</span>
              </div>
            </div>
            <div class="mb-5">
              <div class="flex justify-between text-[10px] mb-1.5" style="color: #a1a1a1">
                <span data-testid="attendance-progress">진행 {{ attendanceClaimedCount }}/7일</span>
                <span>7일 달성 시 루비+{{ attendanceCycleBonusRuby }} 획득</span>
              </div>
              <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(81,140,219,0.12)">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{ background: 'var(--color-apjek-blue)', width: `${(attendanceClaimedCount / 7) * 100}%` }"
                />
              </div>
            </div>
            <!-- CTA 3상태: 출석하기(검정) / 오늘 출석 완료(비활성) / 7일 출석 완료(비활성) -->
            <button
              type="button"
              :disabled="attendanceCtaDisabled"
              class="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
              :style="attendanceCtaDisabled
                ? { background: 'rgba(200,200,220,0.3)', color: '#c0c8e0', cursor: 'not-allowed' }
                : { background: 'var(--color-apjek-cta)', color: 'white' }"
              data-testid="attendance-cta"
              @click="onAttendanceCheck"
            >
              {{ attendanceCtaLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══════════════ T8 광고보상 팝업 — "AD 광고보상" / "광고를 시청해서 루비 1개를 보상받아요!" / [AD] > 💎 / 검정 필 `광고 보기` ═══════════════ -->
  <CommonModal
    v-model="showFreeCoinDialog"
    :title="$t('home.adCoinTitle')"
    :confirm-text="$t('home.adCoinConfirm')"
    :show-cancel="false"
    @confirm="onClaimAdReward"
  >
    <div class="text-center py-2" data-testid="home-ad-body">
      <p class="text-sm font-semibold text-apjek-text mb-4">{{ $t('home.adCoinDesc') }}</p>
      <!-- [AD] > 💎 일러스트 플레이스홀더 (에셋은 WS-F 자산 대기) -->
      <div class="flex items-center justify-center gap-3 mb-2" aria-hidden="true">
        <span class="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-extrabold text-white" style="background: var(--color-apjek-cta)">AD</span>
        <Icon name="lucide:chevron-right" class="w-5 h-5 text-apjek-text-faint" />
        <span class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style="background: var(--color-apjek-blue-soft)">💎</span>
      </div>
    </div>
  </CommonModal>

  <!-- Onboarding (첫 방문) -->
  <CommonOnboarding :show="showOnboarding" @close="showOnboarding = false" />
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import type {
  AdRewardResponse,
  AttendanceBoardDay,
  HeartResponse,
  InviteResponse,
  ItemResponse,
  NotificationUnreadCountResponse,
  TerrariumResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'
import type { ManageTab, ManageTile } from '~/components/terrarium/ManagePanel.vue'
import type { TierUnlockSuccess } from '~/components/terrarium/TierUnlockModal.vue'
import type { JarLevel } from '~/utils/tierLevels'
import { hasHomeEntryQuery, parseHomeEntryQuery, stripHomeEntryQuery } from '~/utils/homeEntry'
import { useHomeSnapshotStore } from '~/stores/homeSnapshot'
import { useItemsStore } from '~/stores/items'
import { useUserStore } from '~/stores/user'

const { sdk, client } = useOpenApi()
const userStore = useUserStore()
const itemsStore = useItemsStore()
const homeSnapshot = useHomeSnapshotStore()
const toast = useToast()
const { t } = useI18n()
const { trackHeartClick, trackShareCreated, trackScreenshotSaved, trackAdRewardClaimed, trackFreePlacementSaved } = useGtagEvents()
const { hapticImpact, share: nativeShare, shareToInstagram } = useNative()
const config = useRuntimeConfig()
const attendance = useAttendance()
const tier = useTier()
const bgm = useBgm()

// ─── 좌표계 (MyTerra.tsx 그대로) ───
const JAR = { minX: 30, maxX: 370, minY: 160, maxY: 520 }
const EDIT = { minX: JAR.minX, maxX: JAR.maxX, minY: JAR.minY + 60, maxY: JAR.maxY }
const BASE_SIZE = 52
const HALF = BASE_SIZE / 2
const HANDLE = 10
// 새 아이템 기본 배치 위치 (EDIT 영역 안). 자유배치 posX/posY(0~1) 로 변환해 저장.
const DEFAULT_POSITIONS = [
  { x: 140, y: 280 }, { x: 240, y: 260 }, { x: 105, y: 380 }, { x: 200, y: 390 },
  { x: 285, y: 365 }, { x: 168, y: 320 }, { x: 255, y: 335 }, { x: 118, y: 340 },
]

// 자유배치 아이템. posX/posY + scale/flipped/zIndex 모두 updateFreePosition 으로 영속(req3 #2).
interface PlacedFreeItem {
  placementId: number
  itemId: number
  image: string
  name: string
  isAnimated: boolean
  // 컨테이너(400×552) px 좌표 (posX/posY 0~1 ↔ px 변환).
  x: number
  y: number
  scale: number
  flipped: boolean
  zIndex: number
  rarity: 'common' | 'rare'
}

// ─── 상태 ───
const fetchError = ref<Error | null>(null)
// FE-05 (2026-07-15): 스켈레톤은 "보여줄 데이터가 아직 한 번도 없을 때"만. 탭 복귀 시에는
// homeSnapshot 스토어의 캐시(15s TTL)가 즉시 렌더되고 갱신은 백그라운드에서 돈다
// (이전에는 매 마운트 pending=true 로 전면 스켈레톤 + terrarium/free 재fetch).
const pending = computed<boolean>(() => !homeSnapshot.snapshot && !fetchError.value)
// 프로필과 아이템 카탈로그는 Pinia 스토어가 TTL 캐시(각 15초 / 5분)와 in-flight dedup 을
// 소유한다. 홈이 이 둘을 직접 `sdk` 로 가져오면 탭을 오갈 때마다 같은 응답을 다시 받는다.
// 테라리움/자유배치는 낙관적 배치와 롤백 스냅샷을 이 페이지가 직접 소유하므로 그대로 둔다.
const user = computed<UserMeResponse | null>(() => userStore.me as UserMeResponse | null)
const allItems = computed<ItemResponse[]>(() => itemsStore.items as ItemResponse[])
const terrarium = ref<TerrariumResponse | null>(null)
const placedItems = ref<PlacedFreeItem[]>([])

const editMode = ref<boolean>(false)
const selectedItemId = ref<number | null>(null)
const capturingImage = ref<boolean>(false)
const zoomLevel = ref<number>(1)
// 스테이지(400×552 설계 기준)를 컨테이너 폭에 uniform 하게 맞추는 배율. flex 축소로 폭만
// 줄면 병 아트(%-inset)와 px 좌표계의 기준이 어긋나므로, 스테이지는 shrink-0 로 400 을
// 유지하고 이 배율로만 축소한다. 드래그/리사이즈 좌표 환산도 zoomLevel*stageFit 사용.
const stageFit = ref<number>(1)
// 컨테이너는 로딩 스켈레톤 뒤에 늦게 마운트되므로(onMounted 시점 DOM 부재) template ref 를
// watch 해 요소가 나타나는 시점에 observer 를 부착한다.
const stageEl = ref<HTMLElement | null>(null)
let stageFitObserver: ResizeObserver | null = null
watch(stageEl, (el) => {
  stageFitObserver?.disconnect()
  stageFitObserver = null
  if (!el || typeof ResizeObserver === 'undefined') return
  stageFitObserver = new ResizeObserver(() => {
    stageFit.value = Math.min(1, el.clientWidth / 400)
  })
  stageFitObserver.observe(el)
})
onBeforeUnmount(() => {
  stageFitObserver?.disconnect()
  stageFitObserver = null
})

const showShareDialog = ref<boolean>(false)
const showAttendance = ref<boolean>(false)
const showRanking = ref<boolean>(false)
const showFreeCoinDialog = ref<boolean>(false)
// 광고 진입점 가용성 — SSR 은 항상 숨김, 클라 마운트 후 판정(하이드레이션 mismatch 회피).
// T7b: 메뉴는 상시 노출하고, 비가용 환경은 탭 시 안내 토스트(§4 N-3).
const adAvailable = ref<boolean>(false)
onMounted(() => {
  const { isNative: adNative, isAndroid: adAndroid } = useAdMob()
  adAvailable.value = (adNative && adAndroid) || import.meta.dev
})
function onAdMenuClick() {
  if (adAvailable.value) {
    showFreeCoinDialog.value = true
    return
  }
  toast.info('앱에서 이용할 수 있어요')
}
const showOnboarding = ref<boolean>(false)
const showExchange = ref<boolean>(false)

// ─── T3b/T13 모드 진입 인트로 — 1.2초 스플래시 후 실제 모드 전환 ───
const introMode = ref<'healing' | 'manage' | null>(null)

// ─── T3b 힐링 모드 — 풀블리드 감상 오버레이 + 상단 필바(BGM/X) (배치/시들기/하트 로직 무변경) ───
const healingMode = ref<boolean>(false)
// 보기 모드 축소 배율 — Figma "나의테라 - 기본" 은 병이 화면 폭의 약 35%, 흰 글로우 원이 약 62% 다.
// 관리 모드(배치 편집)·힐링 모드(풀블리드)는 설계 기준 큰 병을 그대로 쓴다. 드래그/리사이즈 좌표
// 환산은 편집 모드에서만 일어나므로 viewScale 은 1 이고 기존 식(zoomLevel*stageFit)이 유지된다.
const VIEW_SCALE = 0.44
const viewScale = computed<number>(() => (editMode.value || healingMode.value ? 1 : VIEW_SCALE))
// 병 뒤 글로우 원 — 보기 모드에서는 작아진 병을 감싸도록 스테이지 좌표계에서 더 크게 그린다.
const backdropSize = computed<number>(() => (viewScale.value < 1 ? 620 : 430))
function enterHealingMode() {
  introMode.value = 'healing'
}
function onHealingIntroDone() {
  if (introMode.value !== 'healing') return
  introMode.value = null
  healingMode.value = true
  void bgm.play()
}
function onToggleBgm() {
  void bgm.toggle()
}
// 힐링 모드 종료(X/ESC/뒤로가기) 시 BGM 정지 — 페이지 이탈 시 정지는 useBgm 이 unmount 에서 보장.
watch(healingMode, (on) => {
  if (!on) bgm.stop()
})

// ─── T4b 아코디언 (친구 목록 / 보유 재화) — 기본 열림, 사용자가 접으면 localStorage 기억 ───
const ACCORDION_KEYS = { friends: 'tw-home-friends-open', wallet: 'tw-home-wallet-open' } as const
const friendsOpen = ref<boolean>(true)
const walletOpen = ref<boolean>(true)
function readAccordionPref(key: string, fallback: boolean): boolean {
  if (!import.meta.client) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  }
  catch {
    return fallback
  }
}
function writeAccordionPref(key: string, open: boolean): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(key, open ? '1' : '0')
  }
  catch {
    // 저장소 접근 불가 — 세션 내 상태만 유지
  }
}
onMounted(() => {
  friendsOpen.value = readAccordionPref(ACCORDION_KEYS.friends, true)
  walletOpen.value = readAccordionPref(ACCORDION_KEYS.wallet, true)
})
watch(friendsOpen, open => writeAccordionPref(ACCORDION_KEYS.friends, open))
watch(walletOpen, open => writeAccordionPref(ACCORDION_KEYS.wallet, open))

// 친구 목록 — 아코디언 첫 오픈 시 1회 lazy load (기본 열림이라 마운트 직후 로드된다).
// T15 방문 모달이 좋아요 수를 쓰므로 friends 페이지의 FriendItem 과 같은 shape 로 받는다.
interface HomeFriend { userId: string, nickname: string, likeCount: number, liked?: boolean }
const homeFriends = ref<HomeFriend[]>([])
const homeFriendsLoading = ref<boolean>(false)
const homeFriendsError = ref<boolean>(false)
let homeFriendsLoaded = false
async function loadHomeFriends() {
  if (homeFriendsLoaded || homeFriendsLoading.value) return
  homeFriendsLoading.value = true
  homeFriendsError.value = false
  try {
    const { data, error } = await sdk.listFriends({ client })
    if (error) throw error
    homeFriends.value = (castData<HomeFriend[]>(data) ?? []).slice(0, 5).map(f => ({ ...f, likeCount: f.likeCount ?? 0, liked: f.liked ?? false }))
    homeFriendsLoaded = true
  }
  catch {
    // 실패는 빈 상태로 위장하지 않고 구분 표시 — 다음 아코디언 오픈 시 재시도된다.
    homeFriendsError.value = true
  }
  finally {
    homeFriendsLoading.value = false
  }
}
// 클라이언트에서만 로드 — SSR 에서 호출하면 JWT 없이 실패해 "불러오지 못했어요" 가 그대로 하이드레이션된다.
watch(friendsOpen, (open) => {
  if (open && import.meta.client) void loadHomeFriends()
}, { immediate: true })

// ─── T15 친구 방문 모달 — friends 페이지와 동일 핸들러(visitFriendTerrarium / toggleFriendLike) ───
const visitModalOpen = ref<boolean>(false)
const visitFriend = ref<HomeFriend | null>(null)
const visitTerrarium = ref<TerrariumResponse | null>(null)
const visitingId = ref<string | null>(null)
const likingId = ref<string | null>(null)
async function onVisitFriend(friend: HomeFriend) {
  if (visitingId.value) return
  visitingId.value = friend.userId
  visitFriend.value = friend
  visitTerrarium.value = null
  visitModalOpen.value = true
  try {
    const { data, error } = await sdk.visitFriendTerrarium({ client, path: { friendId: friend.userId } })
    if (error) throw error
    visitTerrarium.value = castData<TerrariumResponse>(data) ?? null
  }
  catch {
    // 실패를 방치하면 모달이 로딩 상태로 영구 고착된다 — 닫고 안내.
    visitModalOpen.value = false
    toast.error(t('friends.visitError'))
  }
  finally {
    visitingId.value = null
  }
}
async function onToggleLike(friend: HomeFriend) {
  if (likingId.value) return
  likingId.value = friend.userId
  try {
    const { data, error } = await sdk.toggleFriendLike({ client, path: { friendId: friend.userId } })
    if (error) throw error
    const result = castData<{ liked: boolean, likeCount: number }>(data)
    if (result) {
      friend.liked = result.liked
      friend.likeCount = result.likeCount
      toast.success(result.liked ? '좋아요를 남겼어요 ♥' : '좋아요를 취소했어요')
    }
  }
  catch {
    toast.error(t('friends.likeError'))
  }
  finally {
    likingId.value = null
  }
}

// 보유 재화 — currency util 의 표시 메타 재사용. 코인류 3종(코인/반짝이/루비) + 활동 토큰 4종 분리 표시.
const mainCurrencies = CURRENCY_META.filter(c => c.code === 'COIN' || c.code === 'SPARKLE' || c.code === 'RUBY')
const tokenCurrencies = CURRENCY_META.filter(c => c.code === 'DEW' || c.code === 'SUN' || c.code === 'BOLT' || c.code === 'WIND')
const rubyBalance = computed<number>(() => balanceOf(user.value?.currency, 'RUBY'))

// 잔액 표시 포맷 — profile 페이지와 동일 규약(소수 절사 + 천단위 구분).
function formatBalance(amount: number): string {
  return Math.floor(amount).toLocaleString()
}

// ─── T1b 알림 — 우측 슬라이드 패널 + 미읽음 마젠타 점 뱃지 ───
const showNotifications = ref<boolean>(false)
const notifyUnread = ref<number>(0)
function onNotifyClick() {
  showNotifications.value = true
}
// 미읽음 수는 홈 마운트 시 1회만 조회 — 백엔드 컨트롤러 구현 중이라 실서버 404 가능.
// 실패하면 뱃지만 숨기고 재시도하지 않는다(알림이 안 떠도 홈은 깨지지 않아야 한다).
onMounted(async () => {
  try {
    const { data, error } = await sdk.getUnreadNotificationCount({ client })
    if (error) return
    notifyUnread.value = castData<NotificationUnreadCountResponse>(data)?.count ?? 0
  }
  catch {
    // 조용한 실패 — 뱃지 숨김 유지
  }
})

// Android 하드웨어 뒤로가기 — CommonModal 을 거치지 않는 이 페이지의 bespoke 오버레이(Teleport
// v-if 패널)들은 각자 back-stack 에 직접 등록해야 뒤로가기가 라우트 이동/앱종료 대신 오버레이부터
// 닫는다(showFreeCoinDialog 는 CommonModal, 공유/초대/해금 팝업은 TerrariumHomeDialog 가 각자 처리 — 중복 등록 방지).
const { pushBackHandler } = useBackButtonStack()
function registerOverlayBackClose(overlayOpen: Ref<boolean>) {
  let unregister: (() => void) | null = null
  watch(overlayOpen, (open) => {
    if (open) {
      unregister = pushBackHandler(() => { overlayOpen.value = false })
    } else {
      unregister?.()
      unregister = null
    }
  })
  // 오버레이가 열린 채로 라우트 이탈(딥링크/탭 네비게이션)해 이 페이지가 unmount 되면
  // watch 의 close 분기가 안 돌아 스택에 stale handler 가 영구히 남는다.
  onBeforeUnmount(() => {
    unregister?.()
    unregister = null
  })
}
// bespoke 오버레이 role="dialog" aria-modal="true" 에 실제 focus trap 부여. 힐링 모드는 스테이지
// 컨테이너 자체가 오버레이 루트가 되므로 stageEl 을 트랩 루트로 재사용한다(스크롤 잠금 + ESC 닫기 포함).
const attendanceRoot = ref<HTMLElement | null>(null)
useDialogFocusTrap(attendanceRoot, showAttendance, () => { showAttendance.value = false })
useDialogFocusTrap(stageEl, healingMode, () => { healingMode.value = false })

registerOverlayBackClose(showAttendance)
registerOverlayBackClose(healingMode)
// 관리 모드도 뒤로가기로 종료(하단 패널이 nav 를 덮으므로 탈출 경로 보장).
registerOverlayBackClose(editMode)

// ─── T10b 초대코드 팝업 상태 — 발급 코드는 변형 없이 그대로 표시(표기만 TERRA - 코드) ───
const showInviteCode = ref<boolean>(false)
const inviteCode = ref<string>('')
const inviteLink = ref<string>('')
// 보상 수치 — `InviteResponse.inviterRuby/inviteeRuby`(BE 설정값, 카피 표시용). 발급 응답으로 채운다.
const inviteInviterRuby = ref<number>(0)
const inviteInviteeRuby = ref<number>(0)
const inviteCreating = ref<boolean>(false)

const heartBusy = ref<boolean>(false)
const heartFloats = ref<{ id: number }[]>([])
const placementBusy = ref<boolean>(false)

// ─── Computed ───
// 출석 (useAttendance 실 API — /rewards/attendance). 7일 보드·일차·보너스는 서버 AttendanceResponse 가 SoT.
const alreadyCheckedToday = computed<boolean>(() => Boolean(attendance.state.value?.today))
const attendanceLoading = computed<boolean>(() => attendance.loading.value)
// 7일 보드(day 1~7 순서) — 미로드 시 빈 배열(팝업이 열려도 칸이 없을 뿐 크래시 없음).
const attendanceBoard = computed<AttendanceBoardDay[]>(() => attendance.state.value?.board ?? [])
// "진행 n/7일" = 이번 사이클에서 수령한 칸 수.
const attendanceClaimedCount = computed<number>(() => attendanceBoard.value.filter(d => d.claimed).length)
const attendanceCycleBonusRuby = computed<number>(() => attendance.state.value?.cycleBonusRuby ?? 0)
// 다음 체크인 일차(체크인 전) / 오늘 일차(체크인 후) — 점선 강조는 체크인 전에만.
const attendanceCycleDay = computed<number>(() => attendance.state.value?.cycleDay ?? 1)
// 7일 달성 = 7일차 수령 + 사이클 보너스 수령 (오늘 7일차를 막 완료한 상태, 내일부터 새 사이클).
const attendanceCycleDone = computed<boolean>(() => {
  const st = attendance.state.value
  if (!st) return false
  return st.cycleBonusClaimed && (st.board.find(d => d.day === 7)?.claimed ?? false)
})
const attendanceSubtitle = computed<string>(() => {
  if (attendanceCycleDone.value) return '7일 출석을 모두 달성했어요!'
  if (alreadyCheckedToday.value) return '오늘 출석 완료!'
  return '7일 연속 출석하면 보너스 루비를 받아요!'
})
const attendanceCtaLabel = computed<string>(() => {
  if (attendanceCycleDone.value) return '7일 출석 완료'
  if (alreadyCheckedToday.value) return '오늘 출석 완료'
  return '출석하기'
})
const attendanceCtaDisabled = computed<boolean>(() => alreadyCheckedToday.value || attendanceLoading.value)

// 보유 아이템 — slug 기준으로 소유 판정. 관리 패널 탭별로 layout 으로 나눈다
// (아이템 배치 = FOREGROUND, 정령 = FIGURE, 배경 = BACKGROUND).
const ownedSlugs = computed<Set<string>>(() => new Set(user.value?.ownedItems ?? []))
const ownedItems = computed<ItemResponse[]>(() =>
  allItems.value.filter(item => item.slug && ownedSlugs.value.has(item.slug)),
)
const ownedPlaceables = computed<ItemResponse[]>(() => ownedItems.value.filter(i => i.layout !== 'BACKGROUND' && i.layout !== 'FIGURE'))
const ownedSpirits = computed<ItemResponse[]>(() => ownedItems.value.filter(i => i.layout === 'FIGURE'))
const ownedBackgrounds = computed<ItemResponse[]>(() => ownedItems.value.filter(i => i.layout === 'BACKGROUND'))
const maxSlots = computed<number>(() => terrarium.value?.maxSlots ?? 6)

// ─── Helpers ───
function isUrl(s: string | undefined | null): boolean {
  return !!s && (s.startsWith('http') || s.startsWith('/'))
}

function isItemPlaced(itemId: number): boolean {
  return placedItems.value.some(p => p.itemId === itemId)
}

function visualHalf(placed: PlacedFreeItem): number {
  return HALF * placed.scale
}

function animClass(placed: PlacedFreeItem): string {
  if (editMode.value) return ''
  if (placed.rarity === 'rare') return 'item-shake'
  if (placed.isAnimated) return 'item-float'
  return ''
}

function itemStyle(placed: PlacedFreeItem): Record<string, string> {
  return {
    left: `${placed.x - HALF}px`,
    top: `${placed.y - HALF}px`,
    width: `${BASE_SIZE}px`,
    height: `${BASE_SIZE}px`,
    cursor: editMode.value ? 'grab' : 'default',
    touchAction: 'none',
    overflow: 'visible',
    zIndex: String(10 + placed.zIndex),
    ...(placed.rarity === 'rare' && !editMode.value ? { transformOrigin: 'bottom center' } : {}),
  }
}

function corners(placed: PlacedFreeItem) {
  const vh = visualHalf(placed)
  return [
    { key: 'tl', ox: -vh, oy: -vh, dirX: -1, dirY: -1, cursor: 'nw-resize' },
    { key: 'tr', ox: vh, oy: -vh, dirX: 1, dirY: -1, cursor: 'ne-resize' },
    { key: 'bl', ox: -vh, oy: vh, dirX: -1, dirY: 1, cursor: 'sw-resize' },
    { key: 'br', ox: vh, oy: vh, dirX: 1, dirY: 1, cursor: 'se-resize' },
  ]
}

function itemButtons(placed: PlacedFreeItem) {
  return [
    { label: '앞으로', icon: 'lucide:chevron-up', bg: '#7edbc0', offsetY: HALF - 52, onClick: () => changeDepth(placed, 1) },
    { label: '뒤로', icon: 'lucide:chevron-down', bg: '#97a8f1', offsetY: HALF - 26, onClick: () => changeDepth(placed, -1) },
    { label: '반전', icon: 'lucide:arrow-left-right', bg: '#f5c518', offsetY: HALF, onClick: () => flipItem(placed) },
    { label: '삭제', icon: 'lucide:trash-2', bg: '#f06060', offsetY: HALF + 26, onClick: () => removeItem(placed) },
  ]
}

// 오늘 체크인할 칸(점선 강조) — 체크인 전의 cycleDay 칸만. 체크인 후에는 모두 체크/대기 표시.
function attDotCurrent(day: number): boolean {
  return day === attendanceCycleDay.value && !alreadyCheckedToday.value
}

// ─── API 로드 ───
async function load() {
  fetchError.value = null
  try {
    // 스토어 3개 — 캐시 적중 시 네트워크 0회. terrarium+free 는 homeSnapshot 스토어가
    // 병렬 fetch 후 원자 커밋 (교차 시점 응답 섞임 방지, FE-05). 스토어 쪽은 실패 시
    // 스스로 throw 하므로 아래 catch 가 그대로 재시도 UI 를 띄운다. 로컬 상태 반영은
    // 아래 snapshot watch(applySnapshot) 단일 경로.
    await Promise.all([
      userStore.fetchMe(),
      itemsStore.fetchAll(),
      homeSnapshot.fetch(),
    ])
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
}

// 스냅샷 → 로컬 편집 상태 반영 (단일 적용 경로 — 초기 로드/탭 복귀/배치 후 재로드 공통).
// carry: 같은 placementId 의 세션 값(비영속 폴백 위치 등)을 유지 — 재적용이 멱등이 되게 한다.
function applySnapshot(snap: NonNullable<typeof homeSnapshot.snapshot>) {
  if (snap.terrarium) terrarium.value = snap.terrarium as TerrariumResponse
  const prev = new Map(placedItems.value.map(p => [p.placementId, p]))
  placedItems.value = (snap.freePlacements?.items ?? []).map((it, i): PlacedFreeItem => {
    const carry = prev.get(it.placementId)
    const fallback = fallbackPos(i)
    const cat = allItems.value.find(c => c.id === it.itemId)
    return {
      placementId: it.placementId,
      itemId: it.itemId,
      image: it.itemImage,
      name: it.itemName,
      isAnimated: Boolean(cat?.isAnimated),
      // 로드 clamp 도메인 = 컨테이너 전체(0~400/0~552) — 서버 저장값(0~1) 을 손상 없이 표시.
      // 드래그 이동 중 clamp 만 EDIT 영역으로 제한(저장은 x/400·y/552 그대로). 좌표계 일관 (AW-5/VL-06).
      x: it.isFreePlacement ? clamp(it.posX * 400, 0, 400) : (carry?.x ?? fallback.x),
      y: it.isFreePlacement ? clamp(it.posY * 552, 0, 552) : (carry?.y ?? fallback.y),
      // 서버 영속값 우선(req3 #2), 세션 carry fallback, 기본값 순.
      scale: it.scale ?? carry?.scale ?? 1,
      flipped: it.flipped ?? carry?.flipped ?? false,
      zIndex: it.zIndex ?? carry?.zIndex ?? i,
      rarity: (cat?.rarity === 'RARE' || cat?.rarity === 'EPIC') ? 'rare' : 'common',
    }
  })
}

// immediate: 탭 복귀 시 캐시된 스냅샷을 네트워크 대기 없이 즉시 렌더 (FE-05).
// 편집 모드 중에는 적용을 보류 — 진행 중 드래그/미저장 편집을 백그라운드 응답이
// 되돌리지 않게 하고, 편집 종료 시점에 최신 스냅샷을 반영한다.
let deferredSnapshotApply = false
watch(() => homeSnapshot.snapshot, (snap) => {
  if (!snap) return
  if (editMode.value) {
    deferredSnapshotApply = true
    return
  }
  applySnapshot(snap)
}, { immediate: true })
watch(editMode, (on) => {
  if (on || !deferredSnapshotApply) return
  deferredSnapshotApply = false
  const snap = homeSnapshot.snapshot
  if (snap) applySnapshot(snap)
})

function fallbackPos(index: number): { x: number, y: number } {
  const base = DEFAULT_POSITIONS[index % DEFAULT_POSITIONS.length]!
  return { x: base.x, y: base.y }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─── T13 관리 모드 — 인트로 → 칩 3종 + 하단 고정 패널 + [저장하기] ───
const manageTab = ref<ManageTab>('items')
const manageChips: { tab: ManageTab, label: string, icon: string }[] = [
  { tab: 'items', label: '아이템 배치', icon: '🌱' },
  { tab: 'spirits', label: '정령', icon: '' },
  { tab: 'backgrounds', label: '배경 설정', icon: '✏️' },
]
const saving = ref<boolean>(false)
// 편집 후 서버 저장이 아직 확정되지 않은 배치(드래그 종료 즉시 저장이 실패했거나 진행 중) —
// [저장하기]가 최종 확정 시점이라 여기 남은 것만 재전송한다.
const dirtyPlacementIds = ref<Set<number>>(new Set())

// 인트로가 끝난 뒤 열 탭 — 딥링크(`/?mode=manage&tab=spirit`)로 정령 탭 직행할 때만 items 가 아니다.
let pendingManageTab: ManageTab = 'items'
function enterManageMode(tab: ManageTab = 'items') {
  pendingManageTab = tab
  introMode.value = 'manage'
}
function onManageIntroDone() {
  if (introMode.value !== 'manage') return
  introMode.value = null
  manageTab.value = pendingManageTab
  pendingManageTab = 'items'
  selectedItemId.value = null
  editMode.value = true
}

// ─── 홈 진입 쿼리(관리 모드 딥링크) — 스냅샷 로드 뒤 1회 소비하고 주소에서 지운다 ───
const route = useRoute()
const router = useRouter()
function consumeHomeEntryQuery() {
  const query = route.query
  if (!hasHomeEntryQuery(query)) return
  const entry = parseHomeEntryQuery(query)
  // 되돌아가기/새로고침에 다시 관리 모드로 빠지지 않도록 쿼리만 정리(히스토리 추가 없음)
  void router.replace({ path: route.path, query: stripHomeEntryQuery(query) })
  if (entry.mode === 'manage' && !editMode.value && introMode.value === null) {
    enterManageMode(entry.tab ?? 'items')
  }
}
function exitManageMode() {
  editMode.value = false
  selectedItemId.value = null
}

// 패널 타일 — 탭별 보유 목록. 배치(아이템/정령)/현재 적용(배경) 체크 표시.
const manageTiles = computed<ManageTile[]>(() => {
  if (manageTab.value === 'backgrounds') {
    return ownedBackgrounds.value.map(i => ({ id: i.id, name: i.name, assetUrl: i.assetUrl, checked: currentBackgroundAssetUrl.value === i.assetUrl }))
  }
  const source = manageTab.value === 'spirits' ? ownedSpirits.value : ownedPlaceables.value
  return source.map(i => ({ id: i.id, name: i.name, assetUrl: i.assetUrl, checked: isItemPlaced(i.id) }))
})
const manageEmptyCta = computed<string | undefined>(() => {
  if (manageTab.value === 'spirits') return '키우기 가기'
  return '상점 가기'
})
function onManageEmptyCta() {
  navigateTo(manageTab.value === 'spirits' ? '/grow' : '/shop')
}

// 배치 초과 안내 — Figma 393×88 카드형 토스트 "🚫 배치 가능한 아이템 수를 초과 했습니다 / 배치 가능한 아이템 : N개"
function toastSlotExceeded() {
  toast.error('배치 가능한 아이템 수를 초과 했습니다', {
    icon: '🚫',
    description: `배치 가능한 아이템 : ${maxSlots.value}개`,
    variant: 'card',
  })
}

async function onManageTile(tile: ManageTile) {
  if (manageTab.value === 'backgrounds') {
    const item = ownedBackgrounds.value.find(i => i.id === tile.id)
    if (item) await onSelectBackground(item)
    return
  }
  // 이미 배치된 타일 탭 = 스테이지의 해당 아이템 선택 토글(핸들로 이동/삭제).
  if (tile.checked) {
    const placed = placedItems.value.find(p => p.itemId === tile.id)
    selectedItemId.value = placed && selectedItemId.value !== placed.placementId ? placed.placementId : null
    return
  }
  if (placedItems.value.length >= maxSlots.value) {
    toastSlotExceeded()
    return
  }
  const item = (manageTab.value === 'spirits' ? ownedSpirits.value : ownedPlaceables.value).find(i => i.id === tile.id)
  if (item) await onAddItem(item)
}

// [저장하기] — 미확정 배치를 재전송해 최종 확정하고 토스트 "저장됨" 후 메인으로(관리 모드 종료, 댓글 #41).
async function onSaveManage() {
  if (saving.value) return
  saving.value = true
  try {
    const pendingIds = [...dirtyPlacementIds.value]
    const targets = placedItems.value.filter(p => pendingIds.includes(p.placementId))
    if (targets.length > 0) {
      const results = await Promise.all(targets.map(p => persistPosition(p)))
      if (results.some(ok => !ok)) {
        toast.error('일부 배치를 저장하지 못했어요. 다시 시도해 주세요')
        return
      }
    }
    toast.success('저장됨', { variant: 'pill' })
    exitManageMode()
  }
  finally {
    saving.value = false
  }
}

// ─── 휠 줌 (비편집 시만 — 힐링 모드 포함) ───
function onWheel(e: WheelEvent) {
  if (editMode.value) return
  e.preventDefault()
  zoomLevel.value = clamp(zoomLevel.value + (e.deltaY > 0 ? -0.1 : 0.1), 0.5, 2)
}

// ─── 아이템 선택 ───
// justDragged: 드래그로 종료된 pointerup 직후 발생하는 native click 1회 무시(핸들 사라짐 방지, VL-01).
const justDragged = ref<boolean>(false)
function onItemClick(placed: PlacedFreeItem) {
  if (!editMode.value) return
  if (justDragged.value) {
    justDragged.value = false
    return
  }
  selectedItemId.value = selectedItemId.value === placed.placementId ? null : placed.placementId
}

// ─── 드래그 이동 (PointerEvent — free.vue 패턴) ───
// moved: 이동량(dx²+dy²)>16px² 초과 시 true — pointerup 후 native click 억제 판정에 사용(VL-01).
let dragState: { placementId: number, startX: number, startY: number, baseX: number, baseY: number, moved: boolean } | null = null

function onItemPointerDown(e: PointerEvent, placed: PlacedFreeItem) {
  if (!editMode.value) return
  // 버튼/핸들에서 시작한 pointerdown 은 각자 stop 처리 — 여기는 본체 드래그.
  e.stopPropagation()
  // free.vue 패턴과 동일 — 네이티브 앱에서 드래그 중 브라우저 스크롤/선택 제스처가
  // 끼어드는 것을 방지 (터치 디바이스에서 preventDefault 없으면 드래그 중 스크롤 발생 가능).
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  dragState = { placementId: placed.placementId, startX: e.clientX, startY: e.clientY, baseX: placed.x, baseY: placed.y, moved: false }
  el.addEventListener('pointermove', onItemPointerMove)
  el.addEventListener('pointerup', onItemPointerUp)
  el.addEventListener('pointercancel', onItemPointerUp)
}

function onItemPointerMove(e: PointerEvent) {
  if (!dragState) return
  const target = placedItems.value.find(p => p.placementId === dragState!.placementId)
  if (!target) return
  // zoomLevel·stageFit 반영해 스크린 이동량 → 스테이지(400×552) 좌표 변환.
  const dx = (e.clientX - dragState.startX) / (zoomLevel.value * stageFit.value)
  const dy = (e.clientY - dragState.startY) / (zoomLevel.value * stageFit.value)
  // 스크린 기준 이동량으로 드래그 여부 판정 (4px 임계 = 16px²).
  const rawDx = e.clientX - dragState.startX
  const rawDy = e.clientY - dragState.startY
  if (rawDx * rawDx + rawDy * rawDy > 16) dragState.moved = true
  target.x = clamp(dragState.baseX + dx, EDIT.minX, EDIT.maxX)
  target.y = clamp(dragState.baseY + dy, EDIT.minY, EDIT.maxY)
}

function onItemPointerUp(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.removeEventListener('pointermove', onItemPointerMove)
  el.removeEventListener('pointerup', onItemPointerUp)
  el.removeEventListener('pointercancel', onItemPointerUp)
  if (dragState) {
    // 드래그가 감지되면 뒤따르는 native click 1회 무시(선택 토글로 핸들이 사라지는 것 방지).
    if (dragState.moved) justDragged.value = true
    const target = placedItems.value.find(p => p.placementId === dragState!.placementId)
    if (target) void persistPosition(target)
  }
  dragState = null
}

// ─── 리사이즈 (모서리 핸들) — 종료 시 persistPosition 으로 scale 영속(req3 #2) ───
function onCornerPointerDown(e: PointerEvent, placed: PlacedFreeItem, dirX: number, dirY: number) {
  e.stopPropagation()
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const startX = e.clientX
  const startY = e.clientY
  const startScale = placed.scale
  const baseHalf = 26 * startScale * zoomLevel.value * stageFit.value

  function onMove(ev: PointerEvent) {
    const dx = (ev.clientX - startX) * dirX
    const dy = (ev.clientY - startY) * dirY
    const outward = (dx + dy) / 2
    placed.scale = Math.max(0.3, Math.min(4.0, startScale + (outward / baseHalf) * startScale))
  }
  function onUp() {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    void persistPosition(placed) // 리사이즈 종료 → scale 저장 (req3 #2)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}

// ─── 반전/깊이 — 편집 후 영속(req3 #2) ───
function flipItem(placed: PlacedFreeItem) {
  placed.flipped = !placed.flipped
  void persistPosition(placed)
}
function changeDepth(placed: PlacedFreeItem, delta: number) {
  const maxZ = Math.max(0, placedItems.value.length - 1)
  placed.zIndex = clamp(placed.zIndex + delta, 0, maxZ)
  void persistPosition(placed)
}

// ─── 위치 저장 (드래그 종료 → updateFreePosition, entitlement 필요) ───
// 미보유 안내 toast 는 세션 내 1회만 (매 드래그마다 반복 방지, FP-03).
// 반환값: 서버 확정 여부 — [저장하기]가 미확정 건을 모아 재전송할 때 쓴다.
const freePlacementNoticeShown = ref<boolean>(false)
async function persistPosition(placed: PlacedFreeItem): Promise<boolean> {
  if (!user.value?.entitlements?.freePlacement) {
    // 미보유 시 preview — 저장 시도 안 함(403 회피). 저장 불가 안내 1회.
    if (!freePlacementNoticeShown.value) {
      freePlacementNoticeShown.value = true
      toast.info('자유배치 저장은 잠금해제 후 가능해요')
    }
    return true
  }
  dirtyPlacementIds.value.add(placed.placementId)
  try {
    const posX = clamp(placed.x / 400, 0, 1)
    const posY = clamp(placed.y / 552, 0, 1)
    // 저장 전 진행 중 snapshot fetch 를 세대 무효화 — 저장 완료 전에 도착하는 stale GET 이
    // 스토어에 커밋되어 이 편집을 되돌리는 race 차단.
    homeSnapshot.invalidate()
    // 낙서장 자유배치 편집 영속(req3 #2): 위치 + 크기/반전/깊이 함께 저장.
    const { error } = await sdk.updateFreePosition({
      client,
      path: { placementId: placed.placementId },
      body: { posX, posY, scale: placed.scale, flipped: placed.flipped, zIndex: placed.zIndex },
    })
    if (error) throw new Error(errMsg(error, '위치 저장 실패'))
    trackFreePlacementSaved({ itemCount: placedItems.value.length })
    // 저장 확정값을 스냅샷에 원자 반영 — invalidate 만으로는 탭 복귀 시 저장 전 좌표가
    // 먼저 렌더되고 후속 편집이 그 stale 값을 재전송할 수 있다.
    homeSnapshot.patchFreePlacement(placed.placementId, {
      posX,
      posY,
      scale: placed.scale,
      flipped: placed.flipped,
      zIndex: placed.zIndex,
    })
    dirtyPlacementIds.value.delete(placed.placementId)
    return true
  }
  catch (e) {
    toast.error((e as Error).message)
    return false
  }
}

// ─── 아이템 추가 (관리 패널 타일 → 슬롯 배치 후 free-placement 재로드) ───
async function onAddItem(item: ItemResponse) {
  if (isItemPlaced(item.id)) {
    toast.error('이미 배치된 아이템입니다.')
    return
  }
  placementBusy.value = true
  try {
    // 배치 직전 최신 스냅샷 재조회 — stale terrarium.value 로 덮어쓰기(중복 slotId 400) 방지 (FP-05).
    const terraRes = await sdk.getTerrarium({ client })
    if (terraRes.error) throw new Error(errMsg(terraRes.error, '테라리움 조회 실패'))
    const snapshot = castData<TerrariumResponse>(terraRes.data) ?? terrarium.value
    if (snapshot) terrarium.value = snapshot

    // free-placement 은 슬롯 배치(updateTerrariumPlacements)에서 파생.
    // 낙서장 자유배치(backend req3 #1): slotId 는 배치 인덱스(0..maxSlots-1), tier 슬롯 수만큼 배치 가능.
    // 시각 위치는 free placement(posX/posY)가 결정하므로 layout→slot 제약 없음. 첫 빈 인덱스 배정.
    const usedSlots = new Set((snapshot?.placedItems ?? []).map(p => p.slotId ?? 0))
    const slotCap = snapshot?.maxSlots ?? 6
    let freeSlot = -1
    for (let s = 0; s < slotCap; s++) {
      if (!usedSlots.has(s)) { freeSlot = s; break }
    }
    if (freeSlot < 0) {
      toastSlotExceeded()
      return
    }
    const existing = (snapshot?.placedItems ?? []).map(p => ({ itemId: p.itemId, slotId: p.slotId ?? 0 }))
    existing.push({ itemId: item.id, slotId: freeSlot })

    const { error } = await sdk.updateTerrariumPlacements({ client, body: { placedItems: existing } })
    if (error) throw new Error(errMsg(error, '배치 실패'))

    await reloadAfterPlacement()
    toast.success('아이템이 배치되었습니다!')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    placementBusy.value = false
  }
}

// ─── 아이템 제거 (슬롯에서 제거 → 재로드) ───
async function removeItem(placed: PlacedFreeItem) {
  placementBusy.value = true
  try {
    const existing = (terrarium.value?.placedItems ?? [])
      .filter(p => p.itemId !== placed.itemId)
      .map(p => ({ itemId: p.itemId, slotId: p.slotId ?? 0 }))
    const { error } = await sdk.updateTerrariumPlacements({ client, body: { placedItems: existing } })
    if (error) throw new Error(errMsg(error, '제거 실패'))
    selectedItemId.value = null
    dirtyPlacementIds.value.delete(placed.placementId)
    await reloadAfterPlacement()
    toast.success('아이템이 제거되었습니다!')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    placementBusy.value = false
  }
}

// 배치 변경 후 terrarium + free-placement 재로드 — homeSnapshot 강제 갱신 후 단일 적용
// 경로(applySnapshot, carry 시맨틱)로 반영. 스토어를 거치지 않으면 다음 탭 복귀 때
// 변경 이전의 stale 스냅샷이 되살아난다 (FE-05).
async function reloadAfterPlacement() {
  await homeSnapshot.fetch(true)
  const snap = homeSnapshot.snapshot
  if (snap) applySnapshot(snap)
}

// ─── 하트 (clickTerrariumHeart 실 API) ───
async function onHeartClick() {
  if (heartBusy.value) return
  heartBusy.value = true
  const floatId = Date.now()
  heartFloats.value.push({ id: floatId })
  setTimeout(() => { heartFloats.value = heartFloats.value.filter(f => f.id !== floatId) }, 600)
  try {
    const { data, error } = await sdk.clickTerrariumHeart({ client })
    if (error) throw new Error(errMsg(error, 'heart failed'))
    const heart = castData<HeartResponse>(data)
    // `user` 는 스토어의 readonly 뷰 — 직접 setBalance 하면 프록시가 쓰기를 삼킨다.
    if (heart) userStore.setCurrencyBalance('COIN', heart.updatedBasicCoins)
    trackHeartClick()
    void hapticImpact('Light')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    heartBusy.value = false
  }
}

// ─── 출석 (useAttendance 실 API) ───
async function onAttendanceCheck() {
  if (alreadyCheckedToday.value) return
  const result = await attendance.checkIn()
  if (result) {
    // 서버 currency 로 잔액 동기화 (COIN/RUBY 갱신) — 스토어에 반영해 다른 화면과 공유한다.
    userStore.updateCurrency(result.currency)
    // 필 토스트 "코인 +N" (+ 7일차면 " · 루비 +M") — 보상 수치는 체크인 응답 그대로.
    const rubyBonus = result.reward.rubyBonus > 0 ? ` · 루비 +${result.reward.rubyBonus}` : ''
    toast.success(`${t('attendance.coinReward', { n: result.reward.basicCoins })}${rubyBonus}`, { variant: 'pill' })
    // 7일 달성 팝업 상태("7일 출석 완료")를 보여주기 위해 사이클 완료 시에는 닫지 않는다.
    if (!attendanceCycleDone.value) showAttendance.value = false
  }
  else if (attendance.error.value) {
    toast.error(attendance.error.value)
  }
}

// ─── 광고 보상 (기존 로직 보존 — 보상 표시는 서버 응답(RUBY 1) 기준) ───
async function onClaimAdReward() {
  try {
    const { showRewardedAd, generateNonce } = useAdMob()
    const nonce = generateNonce()
    // SSV 콜백에 user/nonce 식별값 전달 — 서버가 "누가 어떤 nonce 로 시청했나"를 대조할 수 있는
    // 전제 배선 (audit B2-2 부수, SSV-authoritative 전환 Phase 4 의 선행 조건).
    const watched = await showRewardedAd({ ssvUserId: user.value?.userId, ssvCustomData: nonce })
    if (!watched) {
      toast.info(t('home.adWatchRequired'))
      return
    }
    // 동일 nonce 로 claim — 네트워크 실패(throw)면 1회 자동 재시도(nonce dedup 안전, FP-07).
    // 백엔드 반환 에러(한도초과/이미소비 등, error 필드)는 재시도하지 않음(재호출해도 동일 결과).
    let res = await claimWithNonce(nonce, false)
    if (res.networkFailed) res = await claimWithNonce(nonce, true)
    if (res.error) throw new Error(errMsg(res.error, '광고 보상 실패'))
    const ad = castData<AdRewardResponse>(res.data)
    if (ad) userStore.updateCurrency(ad.updatedCurrency)
    // reward.specialCoins 는 필드명만 구세대 — 실지급 재화는 RUBY(백엔드 AdRewardService, 고정 1).
    const reward = ad?.reward.specialCoins ?? 0
    toast.success(t('home.adRewardEarned', { n: reward }), { variant: 'pill' })
    if (reward > 0) trackAdRewardClaimed({ specialCoins: reward, reason: 'daily' })
  }
  catch (e) {
    toast.error((e as Error).message)
  }
}

// claimAdReward 한 번 호출. 백엔드 에러는 error 로, 네트워크 예외는 networkFailed 로 구분해 반환.
async function claimWithNonce(nonce: string, isRetry: boolean): Promise<{ data?: unknown, error?: unknown, networkFailed: boolean }> {
  try {
    const { data, error } = await sdk.claimAdReward({ client, body: { nonce } })
    return { data, error, networkFailed: false }
  }
  catch (e) {
    // 네트워크 예외 — 첫 시도에서만 재시도 허용(재시도까지 실패하면 상위로 전파).
    if (isRetry) throw e
    return { networkFailed: true }
  }
}

// ─── 공유 ───
function onSnsShare() {
  showShareDialog.value = false
  void nativeShare({ title: 'TERRAWORLD', text: t('home.shareText'), url: import.meta.client ? window.location.href : '' })
}

// ─── T10b 초대코드 — 실제 발급(createInvite) + "나의 초대코드" 팝업 + 클립보드 복사/시스템 공유 ───
async function onInviteShare() {
  if (inviteCreating.value) return
  inviteCreating.value = true
  try {
    // friends 페이지와 동일 API — 8자 코드 + 7일 만료. 발급 코드를 변형 없이 그대로 표시한다.
    const { data, error } = await sdk.createInvite({ client })
    if (error) throw new Error(errMsg(error, '초대코드 발급에 실패했어요'))
    const invite = castData<InviteResponse>(data)
    if (!invite?.inviteCode) throw new Error('초대코드 발급에 실패했어요')
    inviteCode.value = invite.inviteCode
    inviteLink.value = invite.inviteLink
    // 보상 카피 "나 : 루비 +{inviterRuby} , 친구 : 루비 +{inviteeRuby}" — 서버 설정값 그대로.
    inviteInviterRuby.value = invite.inviterRuby
    inviteInviteeRuby.value = invite.inviteeRuby
    showShareDialog.value = false
    showInviteCode.value = true
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    inviteCreating.value = false
  }
}

async function onCopyInviteCode() {
  if (!inviteCode.value || !import.meta.client) return
  // friends 페이지 copyMyCode 와 동일 규약 — WebView 에서 clipboard 권한 거부/제스처 밖 호출로
  // write 가 reject 될 수 있어, 복사 실패를 조용히 삼키지 않고 코드를 직접 노출한다.
  // 복사 값은 원본 코드(친구의 코드 입력칸에 그대로 붙여넣을 수 있게) — 'TERRA - ' 접두는 표기 전용.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(inviteCode.value)
      toast.success('초대코드를 복사했어요')
      return
    }
    catch {
      // 아래 폴백으로 진행 — 코드 직접 노출
    }
  }
  toast.info(`초대코드: ${inviteCode.value}`)
}

// [공유 하기] — 시스템 공유 시트(navigator.share / Capacitor Share), 미지원 환경은 useNative.share 가 클립보드 폴백.
async function onShareInviteCode() {
  if (!inviteCode.value) return
  const url = inviteLink.value || (import.meta.client ? window.location.origin : '')
  await nativeShare({
    title: 'TERRAWORLD 초대코드',
    text: `나의 초대코드 TERRA - ${inviteCode.value} 로 테라월드에 가입해요!`,
    url,
  })
}

// ─── T13 배경 설정 — 보유 BACKGROUND 아이템 선택 → setTerrariumBackground + 홈 병 배경 시각 렌더 ───
const backgroundBusy = ref<boolean>(false)
// 응답 BackgroundInfo.id 는 terrarium_backgrounds PK. PUT 은 itemId. 동일 배경은 assetUrl 로 대조.
const currentBackgroundAssetUrl = computed<string | null>(() => terrarium.value?.background?.assetUrl ?? null)
// 병 뒤 배경 레이어 — URL 에셋만 이미지로 그린다(이모지 에셋은 글로우 유지).
// 에셋 로드 실패(기본 배경 `/backgrounds/default.png` 처럼 파일이 없는 시드 URL)면 깨진 이미지 대신 글로우로 폴백.
const backgroundImageFailed = ref<boolean>(false)
watch(currentBackgroundAssetUrl, () => { backgroundImageFailed.value = false })
const backgroundImageUrl = computed<string | null>(() =>
  !backgroundImageFailed.value && isUrl(currentBackgroundAssetUrl.value) ? currentBackgroundAssetUrl.value : null,
)

async function onSelectBackground(item: ItemResponse) {
  if (backgroundBusy.value) return
  // 이미 현재 배경이면 호출 생략 — 서버 동일 배경 재설정 회피.
  if (currentBackgroundAssetUrl.value && item.assetUrl && currentBackgroundAssetUrl.value === item.assetUrl) return
  backgroundBusy.value = true
  try {
    const { error } = await sdk.setTerrariumBackground({ client, body: { itemId: item.id } })
    if (error) throw new Error(errMsg(error, '배경 설정 실패'))
    // 배치 변경과 동일 규약 — homeSnapshot 강제 갱신(fetch(true)) 후 단일 적용 경로로 반영.
    // 편집 모드 중 watch 는 적용을 보류하므로 여기서 직접 applySnapshot 한다(배경은 로컬 편집과 충돌 없음).
    await reloadAfterPlacement()
    toast.success('배경이 설정되었어요!')
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    backgroundBusy.value = false
  }
}

async function onImageSave() {
  // 다이얼로그가 즉시 닫혀 같은 버튼 재클릭은 막히지만, 사용자가 공유 다이얼로그를 다시 열어
  // capture 가 끝나기 전에 "이미지 저장"을 또 누르는 재진입은 막히지 않는다.
  if (capturingImage.value) return
  showShareDialog.value = false
  if (!import.meta.client) return
  capturingImage.value = true
  // 바깥 컨테이너(w-full overflow-hidden)를 캡처하면 onclone 의 scale(1) 원복 후
  // 좁은 화면(<400px)에서 스테이지 좌우가 clip 된다 — 스토리 공유와 동일하게 내부 스테이지
  // (설계 400×552)를 직접 캡처한다.
  const target = document.getElementById('my-terra-container')?.querySelector<HTMLElement>(':scope > div')
  if (!target) {
    toast.error(t('home.shareAreaNotFound'))
    capturingImage.value = false
    return
  }
  try {
    const html2canvas = (await import('html2canvas')).default
    // withTimeout: 캡처가 영구 pending 이면(라이브 실측 2026-07-21 — 토스트/에러 없이 무반응)
    // capturingImage 가 true 로 고착되어 이후 모든 저장 시도가 조용히 무시됐다. 10초 데드라인으로
    // 반드시 catch/finally 에 도달시켜 오류를 표면화하고 busy 를 해제한다.
    // onclone: 스테이지는 stageFit scale 로 축소 렌더 — 원복해 설계 해상도로 캡처
    // (인스타 스토리 공유 경로와 동일 처리, 미적용 시 축소/오프셋 캡처).
    const canvas = await withTimeout(
      html2canvas(target, {
        backgroundColor: '#FFF8EB',
        scale: 2,
        useCORS: true,
        logging: false,
        // withTimeout 은 race 만 끊고 html2canvas 자체는 취소 못 한다 —
        // 내부 이미지 로드 대기(hang 의 전형 원인)를 외부 데드라인보다 짧게 잘라
        // 원본 promise 도 스스로 종료되게 한다.
        imageTimeout: 8_000,
        onclone: (doc) => {
          const cloned = doc.getElementById('my-terra-container')?.querySelector<HTMLElement>(':scope > div')
          if (cloned) {
            cloned.style.transform = 'scale(1)'
            cloned.style.marginBottom = '0px'
          }
        },
      }),
      10_000,
    )
    const filename = `terraworld-${Date.now()}.png`
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      toast.error(t('home.imageConvertFail'))
      return
    }
    // shareToInstagram() 은 취소/실패 시에도 정상 반환하고(내부에서 실패 토스트는 이미 띄움),
    // false 를 돌려준다 — 여기서 성공 토스트/추적이 실패 뒤에도 나가지 않도록 분기.
    const ok = await shareToInstagram(blob, filename, { title: 'TerraWorld', text: t('home.shareText') })
    if (!ok) return
    // Figma 393×88 카드형 토스트 "🖼️ 이미지 저장 완료 / 나의 테라 이미지가 사진첩에 저장되었어요"
    toast.success('이미지 저장 완료', {
      icon: '🖼️',
      description: '나의 테라 이미지가 사진첩에 저장되었어요',
      variant: 'card',
    })
    trackScreenshotSaved({ context: 'home' })
    trackShareCreated({ method: 'screenshot' })
  }
  catch (e) {
    toast.error(t('home.shareFail', { msg: (e as Error).message }))
  }
  finally {
    capturingImage.value = false
  }
}

// ─── 인스타 스토리 공유 (2026-07-21 — 설계 [B]) ───
// 네이티브 + 플러그인 존재 시에만 진입점 노출. 캡처는 400×552 스테이지를 투명 배경으로 —
// onclone 에서 scale transform 을 원복해(스테이지는 화면상 축소 렌더) 설계 해상도로 뜬다.
const storyShareAvailable = ref<boolean>(false)
onMounted(() => {
  const { isNative } = useNative()
  storyShareAvailable.value = isNative && Capacitor.isPluginAvailable('InstagramStories')
})

async function onInstagramStoryShare() {
  if (capturingImage.value || !import.meta.client) return
  showShareDialog.value = false
  const stage = stageEl.value?.querySelector<HTMLElement>(':scope > div')
  if (!stage) {
    toast.error(t('home.shareAreaNotFound'))
    return
  }
  capturingImage.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    // 이미지 저장 경로와 동일한 10초 데드라인 — 캡처 영구 pending 시 busy 고착 방지.
    const canvas = await withTimeout(
      html2canvas(stage, {
        backgroundColor: null, // 투명 스티커 — JPEG 변환 금지(투명도 소실)
        scale: 2,
        useCORS: true,
        logging: false,
        imageTimeout: 8_000, // 이미지 저장 경로와 동일 — hang 원인(이미지 로드 대기) 자체 차단
        onclone: (doc) => {
          const cloned = doc.getElementById('my-terra-container')?.querySelector<HTMLElement>(':scope > div')
          if (cloned) {
            cloned.style.transform = 'scale(1)'
            cloned.style.marginBottom = '0px'
          }
        },
      }),
      10_000,
    )
    const dataUrl = canvas.toDataURL('image/png')
    const { shareToInstagramStory } = await import('~/lib/instagramStories')
    const result = await shareToInstagramStory(dataUrl, String(config.public.metaAppId || ''))
    if (result === 'opened') {
      trackShareCreated({ method: 'instagram_story' })
      return
    }
    // 미설치/미설정/실패 — 기존 시스템 공유 시트로 폴백 (폴백 제거 금지, 설계 [B]).
    toast.info('인스타그램 스토리로 바로 열 수 없어 시스템 공유로 대신 열어요')
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (blob) {
      await shareToInstagram(blob, `terraworld-story-${Date.now()}.png`, { title: 'TerraWorld', text: t('home.shareText') })
    }
  }
  catch (e) {
    toast.error(t('home.shareFail', { msg: (e as Error).message }))
  }
  finally {
    capturingImage.value = false
  }
}

// ─── T14 병 캐러셀 + 해금 팝업 — useTier(getTierCatalog/unlockTier/setActiveTier) 구동, TierInfo.level → Lv1~3 ───
const jarLevels = computed<JarLevel[]>(() => toJarLevels(tier.catalog.value))
// 표시 중인 병 레벨(activeTier) — 카탈로그의 active 플래그가 SoT. 이 레벨의 슬라이드가 라이브 스테이지다.
const viewLevel = computed<number>(() => activeJarLevel(jarLevels.value))
const tierSwitching = ref<boolean>(false)
const unlockTarget = ref<JarLevel | null>(null)
const unlockBusy = ref<boolean>(false)
const unlockSuccess = ref<TierUnlockSuccess | null>(null)

// 해금된 카드 탭 = 표시 병 전환(PUT /terrarium/active-tier). 배치·슬롯 수가 티어별이라 전환 성공 후
// 홈 스냅샷(terrarium + free-placement)을 강제 재조회해 스테이지를 그 병의 배치로 바꾼다(댓글 #46).
async function switchActiveTier(level: JarLevel): Promise<boolean> {
  if (tierSwitching.value) return false
  if (!level.unlocked) return false
  if (level.active) return true
  tierSwitching.value = true
  try {
    const outcome = await tier.setActive(level.tier)
    if (!outcome.ok) {
      const code = outcome.error?.code
      if (code === 'TIER_LOCKED') toast.error('아직 해금되지 않은 테라리움이에요')
      else toast.error(errMsg(outcome.error, '테라리움 전환에 실패했어요'))
      return false
    }
    await reloadAfterPlacement()
    return true
  }
  catch (e) {
    toast.error((e as Error).message)
    return false
  }
  finally {
    tierSwitching.value = false
  }
}
function onSelectLevel(level: JarLevel) {
  void switchActiveTier(level)
}
function onUnlockRequest(level: JarLevel) {
  unlockSuccess.value = null
  unlockTarget.value = level
}
function closeUnlockModal() {
  unlockTarget.value = null
  unlockSuccess.value = null
}
async function onUnlockConfirm(level: JarLevel) {
  if (unlockBusy.value) return
  unlockBusy.value = true
  try {
    const outcome = await tier.unlock(level.tier)
    if (!outcome.ok) {
      const code = outcome.error?.code
      if (code === 'INSUFFICIENT_FUNDS') toast.error('루비가 부족해요')
      else toast.error(errMsg(outcome.error, '해금에 실패했어요'))
      return
    }
    userStore.updateCurrency(outcome.data.updatedCurrency)
    unlockSuccess.value = { level: level.level, tier: level.tier, grantedSpirit: outcome.data.grantedSpirit ?? null }
    // 해금해도 표시 병(activeTier)은 바뀌지 않는다(rev2 R1, 댓글 #46) — 현재 병의 maxSlots 는 그대로이므로
    // 스냅샷은 두고, 정령 지급(ownedItems)·루비 잔액이 바뀐 프로필만 강제 갱신한다.
    await userStore.fetchMe(true)
  }
  catch (e) {
    toast.error((e as Error).message)
  }
  finally {
    unlockBusy.value = false
  }
}
// [관리 모드 바로가기] — "새로운 테라리움을 관리해 보세요": 방금 해금한 병으로 전환한 뒤 관리 모드 진입.
// X 로 닫으면 현재 병이 유지된다(댓글 #46). 전환 실패 시에는 모드 진입 없이 팝업만 닫는다.
async function onUnlockManage() {
  const unlocked = unlockSuccess.value
  closeUnlockModal()
  const target = unlocked ? jarLevels.value.find(l => l.tier === unlocked.tier) ?? null : null
  if (target && !(await switchActiveTier(target))) return
  enterManageMode()
}

// ─── mount ───
onMounted(async () => {
  if (import.meta.client && !localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)) {
    showOnboarding.value = true
  }
  // 셋 중 하나가 던져도 나머지 초기화(딥링크 쿼리 소비)가 막히지 않게 한다 — 마운트 훅의 미처리 예외는
  // Vue 경고만 남기고 어디에도 보고되지 않아 조용히 깨진다.
  const results = await Promise.allSettled([load(), attendance.refresh(), tier.load()])
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[home] 초기 로드 실패(${['load', 'attendance', 'tier'][i]})`, r.reason)
  })
  consumeHomeEntryQuery()
})

// middleware/auth.ts 는 named middleware라 pageMeta 에 명시해야 실행된다. 이게 빠져있어서
// '/' 를 PUBLIC_EXACT 에서 제거해도 실제로는 미들웨어가 전혀 실행되지 않아 미로그인 상태에서
// 메인 화면이 그대로 렌더링되고, API 401 인터셉터가 뒤늦게 로그인으로 리다이렉트하는 flash 버그가
// 그대로 남아있었다.
definePageMeta({ layout: 'default', middleware: 'auth' })
</script>

<style scoped>
/* 상단 메뉴바 아이템 — 연블루 원 + 블루 아이콘 + 미니 라벨 (아프젝 T7) */
.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 52px;
  transition: transform 0.15s ease;
}
.menu-item:active {
  transform: scale(0.93);
}
.menu-circle {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-apjek-surface);
  border: 1px solid color-mix(in srgb, var(--color-apjek-blue) 30%, transparent);
  color: var(--color-apjek-blue);
}
.menu-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: -0.2px;
  white-space: nowrap;
  color: var(--color-apjek-blue-deep);
}

/* 모드 필 (힐링/관리) — 단일행 유지 (wrap 시 인접 요소 겹침 방지 규약) */
.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 9999px;
  padding: 0.7rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  transition: transform 0.15s ease;
}
.mode-pill:active {
  transform: scale(0.95);
}

/* 하트 +1 float — X 중앙은 `-translate-x-1/2`(개별 translate 속성)가 맡으므로 transform 은 Y/scale 만
   (Tailwind v4 함정: transform 에 X 를 넣으면 이중 적용돼 왼쪽으로 밀린다) */
@keyframes heartFloatUp {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-50px) scale(1.2); }
}
.heart-float {
  animation: heartFloatUp 0.6s ease-out forwards;
}

/* rare 흔들림 / isAnimated 부유 (framer-motion 근사) */
@keyframes itemShake {
  0%, 100% { transform: rotate(-1.5deg); }
  50% { transform: rotate(1.5deg); }
}
.item-shake { animation: itemShake 2.5s ease-in-out infinite; }

@keyframes itemFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.item-float { animation: itemFloat 2s ease-in-out infinite; }

/* 중앙 다이얼로그 spring 근사 (출석 팝업) */
.dialog-enter-active,
.dialog-leave-active { transition: opacity 0.25s ease; }
.dialog-enter-active > div:last-child,
.dialog-leave-active > div:last-child { transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1); }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; }
.dialog-enter-from > div:last-child,
.dialog-leave-to > div:last-child { transform: translateY(20px) scale(0.92); }

@media (prefers-reduced-motion: reduce) {
  .dialog-enter-active,
  .dialog-leave-active,
  .dialog-enter-active > div:last-child,
  .dialog-leave-active > div:last-child { transition-duration: 0.01ms; }
}

/* 편집 안내 fade */
.edit-fade-enter-active,
.edit-fade-leave-active { transition: opacity 0.2s ease; }
.edit-fade-enter-from,
.edit-fade-leave-to { opacity: 0; }
</style>
