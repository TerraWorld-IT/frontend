<!--
  홈 화면 — TERRAWORLD2 Figma 프로토타입 `MyTerra.tsx` 픽셀-정확 이식.
  실 데이터 배선: getMe / getTerrarium / listItems / listFreePlacements 병렬 로드,
  하트(clickTerrariumHeart) / 광고보상(claimAdReward) / 출석(useAttendance) / 공유(html2canvas)
  / 자유배치 드래그(updateFreePosition) 실 API. scale/flip/zIndex 는 API 미지원 → 클라 세션 상태.
-->
<template>
  <div class="flex flex-col gap-6 min-h-screen w-full px-4 pt-4 pb-24">
    <!-- Loading -->
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">{{ $t('common.loadFail') }}</p>
      <p class="text-xs text-riso-dark/60">{{ $t('common.loadFailDesc') }}</p>
      <button
        class="mt-2 px-4 py-2 rounded-full bg-riso-sage text-white text-sm riso-shadow-sm"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- Main -->
    <template v-else>
      <!-- ─── 출석체크 배너 ─── -->
      <div
        v-show="!alreadyCheckedToday"
        class="flex items-center justify-between px-4 py-2.5 rounded-2xl cursor-pointer active:scale-95 transition-all"
        :style="{ background: 'linear-gradient(135deg,#e8f0ff 0%,#f5e8ff 100%)', border: '1.5px solid rgba(151,168,241,0.3)' }"
        @click="showAttendance = true"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-lg">📅</span>
          <div>
            <p class="text-xs font-semibold" style="color: #5b6fa6">출석체크</p>
            <p class="text-[10px]" style="color: #a0afd8">오늘 출석하고 ⭐ 받기</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <div
            v-for="i in 7"
            :key="`banner-dot-${i}`"
            class="w-3 h-3 rounded-full transition-all"
            :style="{ background: (i - 1) < checkedCount ? 'linear-gradient(135deg,#97a8f1,#c4a0f0)' : 'rgba(151,168,241,0.2)' }"
          />
        </div>
      </div>

      <!-- ─── 상단 헤더 ─── -->
      <div class="flex items-center justify-between">
        <!-- 왼쪽: 이름 + 관리하기/편집완료 토글 -->
        <div class="flex flex-col items-start gap-1">
          <div class="font-bold text-lg text-black">{{ terrariumName }}</div>
          <button
            type="button"
            class="h-10 flex items-center gap-1.5 text-xs font-semibold px-3 rounded-lg transition-all active:scale-95"
            :style="editMode
              ? { background: 'linear-gradient(135deg,#7edbc0,#52b388)', color: 'white', boxShadow: '0 2px 10px rgba(126,219,192,0.4)' }
              : { background: 'rgba(126,219,192,0.18)', color: '#3a9e78' }"
            @click="toggleEditMode"
          >
            <template v-if="editMode">
              <Icon name="lucide:check" class="w-3 h-3" />편집 완료
            </template>
            <template v-else>
              <Icon name="lucide:pencil" class="w-3 h-3" />테라리움 관리하기
            </template>
          </button>
        </div>

        <!-- 오른쪽: 일반 모드 4버튼 / 편집 모드 2버튼 -->
        <!-- flex-wrap: 448px(TW2 설계폭)선 1줄 유지, 그보다 좁은 폰에선 버튼 통째로 다음 줄(음절 wrap 방지). -->
        <div class="flex flex-wrap justify-end gap-2">
          <template v-if="!editMode">
            <!-- 1. 출석체크 -->
            <button
              type="button"
              data-testid="home-attendance"
              class="h-10 w-10 rounded-lg flex items-center justify-center transition-colors relative"
              :style="{ background: alreadyCheckedToday ? 'rgba(151,168,241,0.25)' : 'rgba(151,168,241,0.5)' }"
              aria-label="출석체크"
              @click="showAttendance = true"
            >
              <span class="text-base">📅</span>
              <span
                v-if="alreadyCheckedToday"
                class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-white text-[8px] flex items-center justify-center text-white"
              >✓</span>
            </button>
            <!-- 2. 광고 -->
            <button
              type="button"
              data-testid="home-freecoin"
              class="h-10 w-10 rounded-lg flex items-center justify-center transition-colors"
              style="background: rgba(140,106,228,0.4)"
              :aria-label="$t('home.ariaFreeCoin')"
              @click="showFreeCoinDialog = true"
            >
              <Icon name="lucide:gift" class="w-4 h-4 text-white" />
            </button>
            <!-- 3. 랭킹 -->
            <button
              type="button"
              data-testid="home-ranking"
              class="h-10 w-10 rounded-lg flex items-center justify-center transition-colors"
              style="background: rgba(252,238,90,0.5)"
              aria-label="랭킹"
              @click="showRankingDialog = true"
            >
              <Icon name="lucide:trophy" class="w-4 h-4 text-amber-600" />
            </button>
            <!-- 4. 이미지저장(공유) -->
            <button
              type="button"
              data-testid="home-share"
              class="h-10 w-10 rounded-lg flex items-center justify-center transition-colors bg-[rgba(89,87,87,0.4)] hover:bg-[rgba(89,87,87,0.6)]"
              :aria-label="$t('home.ariaSaveTerrarium')"
              @click="showShareDialog = true"
            >
              <Icon name="lucide:share-2" class="w-4 h-4 text-white" />
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              data-testid="home-add-item"
              class="h-10 flex items-center gap-1.5 px-3 rounded-lg transition-colors text-white"
              style="background: linear-gradient(135deg,#7edbc0,#52b388); box-shadow: 0 2px 8px rgba(82,179,136,0.4)"
              @click="showItemPicker = true"
            >
              <Icon name="lucide:plus" class="w-4 h-4 flex-shrink-0" />
              <span class="text-xs font-semibold whitespace-nowrap">아이템추가</span>
            </button>
            <button
              type="button"
              data-testid="home-tier"
              class="h-10 flex items-center gap-1.5 px-3 rounded-lg transition-colors text-white"
              style="background: linear-gradient(135deg,#82b3ec,#518cdb); box-shadow: 0 2px 8px rgba(81,140,219,0.4)"
              @click="showTierModal = true"
            >
              <Icon name="lucide:trending-up" class="w-4 h-4 flex-shrink-0" />
              <span class="text-xs font-semibold whitespace-nowrap">테라리움 업그레이드</span>
            </button>
          </template>
        </div>
      </div>

      <!-- ─── 유리병 영역 ─── -->
      <div
        id="my-terra-container"
        class="relative flex justify-center w-full overflow-hidden"
        :style="{ cursor: editMode ? 'default' : 'grab', paddingTop: '1.3rem', paddingBottom: '1.3rem' }"
        @wheel="onWheel"
      >
        <div
          class="transition-transform duration-200 ease-out relative"
          :style="{ transform: `scale(${zoomLevel})`, width: '400px', height: '552px' }"
        >
          <!-- 유리병 (Figma Jar1 픽셀-정확) -->
          <div class="absolute inset-0">
            <IconsJar1 />
          </div>

          <!-- 시들기 CTA (TW2 미존재 — 낙서장 기능이라 유지, 시각 최소) -->
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
                border: '2px dashed rgba(126,219,192,0.55)',
                background: 'rgba(126,219,192,0.04)',
              }"
            />
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
                  border: '1.5px dashed rgba(126,219,192,0.75)',
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
                  borderColor: '#7edbc0',
                  touchAction: 'none',
                }"
                @pointerdown="(e) => onCornerPointerDown(e, placed, c.dirX, c.dirY)"
              />
            </template>
          </div>

          <!-- 하트 버튼 (편집모드 숨김) -->
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
      </div>
    </template>
  </div>

  <!-- ═══════════════ 아이템 추가 바텀시트 ═══════════════ -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="showItemPicker" class="fixed inset-0 z-[9997]">
        <div class="fixed inset-0 bg-black/30" @click="showItemPicker = false" />
        <div
          class="sheet-panel fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
          style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); max-height: calc(100dvh - 98px - 20px)"
        >
          <div class="flex justify-center pt-3 pb-1">
            <div class="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div class="px-5 pb-8 pt-3 overflow-y-auto flex-1">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-base" style="color: #3a9e78">아이템 추가</h3>
              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center"
                style="background: rgba(126,219,192,0.15)"
                @click="showItemPicker = false"
              >
                <Icon name="lucide:x" class="w-4 h-4" style="color: #52b388" />
              </button>
            </div>

            <div v-if="placementBusy" class="flex justify-center py-8">
              <CommonLoading variant="spinner" />
            </div>
            <div v-else-if="ownedItems.length === 0" class="text-center py-10 text-gray-400">
              <div class="text-4xl mb-2">🛒</div>
              <p class="text-sm">보유한 아이템이 없습니다</p>
              <p class="text-xs mt-1">상점에서 구매해보세요!</p>
            </div>
            <div v-else class="grid grid-cols-4 gap-3">
              <button
                v-for="item in ownedItems"
                :key="item.id"
                type="button"
                class="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 relative transition-all"
                :style="{
                  background: isItemPlaced(item.id) ? 'rgba(200,200,220,0.12)' : 'rgba(126,219,192,0.12)',
                  border: isItemPlaced(item.id) ? '1.5px solid rgba(200,200,220,0.3)' : '1.5px solid rgba(126,219,192,0.35)',
                  opacity: isItemPlaced(item.id) ? 0.45 : 1,
                  cursor: isItemPlaced(item.id) ? 'not-allowed' : 'pointer',
                }"
                :disabled="isItemPlaced(item.id)"
                @click="!isItemPlaced(item.id) && onAddItem(item)"
              >
                <img
                  v-if="isUrl(item.assetUrl)"
                  :src="item.assetUrl"
                  :alt="item.name"
                  class="w-10 h-10 object-contain"
                >
                <div v-else class="text-3xl">{{ item.assetUrl }}</div>
                <span class="text-[9px] font-medium text-center leading-tight" style="color: #6b8f7a">
                  {{ item.name }}
                </span>
                <div v-if="isItemPlaced(item.id)" class="absolute top-1 right-1">
                  <Icon name="lucide:check" class="w-3 h-3" style="color: #7edbc0" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══════════════ 공유하기 바텀시트 ═══════════════ -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="showShareDialog" class="fixed inset-0 z-[9997]">
        <div class="fixed inset-0 bg-black/40" @click="showShareDialog = false" />
        <div
          class="sheet-panel fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-3xl shadow-2xl"
          style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px)"
        >
          <div class="flex justify-center pt-3 pb-1">
            <div class="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div class="px-5 pb-10 pt-4">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-bold text-base text-gray-800 flex items-center gap-2">
                <Icon name="lucide:share-2" class="w-4 h-4" />
                공유하기
              </h3>
              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100"
                @click="showShareDialog = false"
              >
                <Icon name="lucide:x" class="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <!-- SNS 공유 -->
              <button
                type="button"
                class="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff); border: 1.5px solid rgba(151,168,241,0.3)"
                @click="onSnsShare"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(151,168,241,0.25)">
                  <Icon name="lucide:share-2" class="w-5 h-5" style="color: #97a8f1" />
                </div>
                <div class="text-left">
                  <div class="text-sm font-semibold text-gray-800">SNS 공유하기</div>
                  <div class="text-xs text-gray-400">친구에게 테라리움을 공유해요</div>
                </div>
              </button>
              <!-- 초대코드 공유 -->
              <button
                type="button"
                class="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                style="background: linear-gradient(135deg,#fefce8,#fef3c7); border: 1.5px solid rgba(252,238,90,0.4)"
                @click="onInviteShare"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(252,238,90,0.3)">
                  <Icon name="lucide:link" class="w-5 h-5 text-amber-600" />
                </div>
                <div class="text-left">
                  <div class="text-sm font-semibold text-gray-800">초대코드 공유하기</div>
                  <div class="text-xs text-gray-400">코드를 복사해서 친구를 초대해요</div>
                </div>
              </button>
              <!-- 이미지 저장 -->
              <button
                type="button"
                class="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                style="background: linear-gradient(135deg,#f0fff4,#e8f5ff); border: 1.5px solid rgba(126,219,192,0.3)"
                @click="onImageSave"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(126,219,192,0.25)">
                  <Icon name="lucide:image-down" class="w-5 h-5" style="color: #52b388" />
                </div>
                <div class="text-left">
                  <div class="text-sm font-semibold text-gray-800">이미지 저장</div>
                  <div class="text-xs text-gray-400">테라리움을 이미지로 저장해요</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══════════════ 랭킹 팝업 (준비중) ═══════════════ -->
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="showRankingDialog" class="fixed inset-0 z-[9997]">
        <div class="fixed inset-0 bg-black/40" @click="showRankingDialog = false" />
        <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto">
          <div
            class="relative rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4"
            style="background: rgba(255,255,255,0.96); backdrop-filter: blur(20px)"
          >
            <button
              type="button"
              class="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
              style="background: rgba(252,238,90,0.2)"
              @click="showRankingDialog = false"
            >
              <Icon name="lucide:x" class="w-4 h-4 text-amber-600" />
            </button>
            <div class="text-5xl">🏆</div>
            <h3 class="text-lg font-bold" style="color: #b8960a">랭킹</h3>
            <p class="text-sm text-gray-500 text-center">랭킹 시스템 준비중입니다 🚀</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══════════════ 출석체크 팝업 ═══════════════ -->
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="showAttendance" class="fixed inset-0 z-[9997]">
        <div class="fixed inset-0 bg-black/40" @click="showAttendance = false" />
        <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto">
          <div class="rounded-3xl p-6 shadow-2xl" style="background: rgba(255,255,255,0.96); backdrop-filter: blur(20px)">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📅</span>
                <div>
                  <h3 class="font-bold text-base" style="color: #5b6fa6">출석체크</h3>
                  <p class="text-[10px]" style="color: #a0afd8">7일 연속 출석 시 보너스 ⭐</p>
                </div>
              </div>
              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center"
                style="background: rgba(151,168,241,0.15)"
                @click="showAttendance = false"
              >
                <Icon name="lucide:x" class="w-4 h-4" style="color: #97a8f1" />
              </button>
            </div>
            <div class="flex justify-center gap-3 mb-6">
              <div v-for="i in 7" :key="`att-dot-${i}`" class="flex flex-col items-center gap-1">
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center"
                  :style="{
                    background: attDotChecked(i - 1)
                      ? 'linear-gradient(135deg,#97a8f1,#c4a0f0)'
                      : attDotCurrent(i - 1) ? 'rgba(151,168,241,0.15)' : 'rgba(200,200,220,0.15)',
                    border: attDotChecked(i - 1)
                      ? 'none'
                      : attDotCurrent(i - 1) ? '2px dashed #97a8f1' : '2px solid rgba(200,200,220,0.4)',
                  }"
                >
                  <Icon v-if="attDotChecked(i - 1)" name="lucide:check-circle-2" class="w-5 h-5 text-white" />
                  <span v-else class="text-xs font-bold" :style="{ color: attDotCurrent(i - 1) ? '#97a8f1' : '#c0c8e0' }">{{ i }}</span>
                </div>
                <span class="text-[9px]" :style="{ color: attDotChecked(i - 1) ? '#97a8f1' : '#c0c8e0' }">
                  {{ i === 7 ? '🎁' : `+${attendanceReward}` }}
                </span>
              </div>
            </div>
            <div class="mb-5">
              <div class="flex justify-between text-[10px] mb-1.5" style="color: #a0afd8">
                <span>진행 {{ checkedCount }}/7일</span>
                <span>7일 달성 시 보너스 ⭐</span>
              </div>
              <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(151,168,241,0.15)">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{ background: 'linear-gradient(90deg,#97a8f1,#c4a0f0)', width: `${(checkedCount / 7) * 100}%` }"
                />
              </div>
            </div>
            <button
              type="button"
              :disabled="alreadyCheckedToday || attendanceLoading"
              class="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
              :style="alreadyCheckedToday
                ? { background: 'rgba(200,200,220,0.3)', color: '#c0c8e0', cursor: 'not-allowed' }
                : { background: 'linear-gradient(135deg,#97a8f1 0%,#c4a0f0 100%)', color: 'white', boxShadow: '0 4px 16px rgba(151,168,241,0.4)' }"
              @click="onAttendanceCheck"
            >
              {{ alreadyCheckedToday ? '오늘 출석 완료 ✓' : `출석체크 하기  +${attendanceReward} ⭐` }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══════════════ 무료 코인(광고 보상) 다이얼로그 ═══════════════ -->
  <CommonModal
    v-model="showFreeCoinDialog"
    :title="$t('home.adCoinTitle')"
    :confirm-text="$t('home.adCoinConfirm')"
    :show-cancel="true"
    :cancel-text="$t('common.close')"
    @confirm="onClaimAdReward"
  >
    <div class="text-center py-2">
      <div class="text-6xl mb-3">📺</div>
      <h4 class="font-semibold text-base mb-2">{{ $t('home.adCoinSubtitle') }}</h4>
      <p class="text-sm text-gray-600 mb-3">{{ $t('home.adCoinDesc') }}</p>
      <div class="bg-purple-50 rounded-lg p-3 text-left mb-3">
        <p class="text-sm font-semibold text-purple-800 mb-1">{{ $t('home.adCoinRewardTitle') }}</p>
        <div class="flex items-center justify-between">
          <span class="text-sm text-purple-700">{{ $t('home.adCoinWatchOnce') }}</span>
          <span class="font-semibold text-purple-800">{{ $t('home.adCoinAmount') }}</span>
        </div>
        <p class="text-xs text-purple-600 pt-2 border-t border-purple-200 mt-2">{{ $t('home.adCoinLimit') }}</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 text-left">{{ $t('home.adCoinHint') }}</div>
    </div>
  </CommonModal>

  <!-- ═══════════════ Tier 모달 (레벨업 대체 — 별도 작업자가 내용 재작업) ═══════════════ -->
  <CommonTierModal :show="showTierModal" @close="showTierModal = false" />

  <!-- ═══════════════ 피드 바텀시트 ═══════════════ -->
  <!-- 스와이프 핸들 — 항상 바텀 nav 위 -->
  <Teleport to="body">
    <div class="fixed left-1/2 -translate-x-1/2 w-full max-w-md z-40" style="bottom: calc(98px + env(safe-area-inset-bottom, 0px))">
      <div
        class="flex justify-center items-center cursor-grab"
        style="height: 28px; touch-action: none; background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); border-radius: 16px 16px 0 0; border: 1px solid rgba(0,0,0,0.08); border-bottom: none"
        @pointerdown="onFeedHandlePointerDown"
      >
        <div class="w-10 h-1 rounded-full bg-black opacity-30" />
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="feedPanelOpen" class="fixed inset-0 z-[9998]">
        <div class="fixed inset-0 bg-black/20" @click="feedPanelOpen = false" />
        <div
          class="sheet-panel fixed left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col"
          style="bottom: calc(98px + env(safe-area-inset-bottom, 0px))"
        >
          <!-- bottom nav 와 동일하게 safe-area-inset-bottom 반영(노치 기기에서 nav 와 겹치던 문제) +
               max-height/overflow-y-auto 로 콘텐츠가 뷰포트를 넘겨도 스크롤 가능(이전엔 overflow-hidden
               이라 넘치는 콘텐츠가 그냥 잘려 도달 불가능했다 — Codex 감사 지적). -->
          <div
            class="rounded-tl-[24px] rounded-tr-[24px] flex flex-col overflow-y-auto"
            style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); box-shadow: 0px -8px 25px rgba(0,0,0,0.15); max-height: calc(100dvh - 98px - env(safe-area-inset-bottom, 0px) - 40px)"
          >
            <div class="flex justify-center pt-3 pb-1">
              <div class="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div class="flex items-center justify-between px-5 py-3">
              <span class="font-bold text-[16px] text-black tracking-[-0.31px]">피드</span>
              <button
                type="button"
                class="size-7 rounded-full flex items-center justify-center"
                style="background: rgba(0,0,0,0.15)"
                @click="feedPanelOpen = false"
              >
                <Icon name="lucide:x" class="w-4 h-4 text-black" />
              </button>
            </div>
            <div class="flex flex-col gap-5 px-5 pb-6">
              <!-- 공지사항 -->
              <button
                type="button"
                class="w-full bg-white rounded-[12px] flex items-center justify-between p-[13px] transition-all active:scale-[0.98]"
                style="border: 1px solid rgba(0,0,0,0.1)"
                @click="toast.info('공지사항 준비중입니다 🚀')"
              >
                <div class="flex items-center gap-3">
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <g clip-path="url(#clip_info2)">
                      <path :d="feedSvg.p39ee6532" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                      <path d="M8 10.6667V8" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                      <path d="M8 5.33333H8.00667" stroke="#525252" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                    </g>
                    <defs><clipPath id="clip_info2"><rect fill="white" width="16" height="16" /></clipPath></defs>
                  </svg>
                  <span class="text-[14px] font-semibold text-black tracking-[-0.15px]">공지사항</span>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path d="M6 12L10 8L6 4" stroke="#AEAEAE" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
                </svg>
              </button>

              <!-- 프로필 + 친구 카드 -->
              <div class="bg-white rounded-[16px] flex flex-col gap-6 p-[21px]" style="border: 1px solid rgba(0,0,0,0.1)">
                <!-- 내 프로필 행 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="size-16 rounded-full flex items-center justify-center text-3xl shrink-0"
                      style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)"
                    >🌍</div>
                    <div>
                      <p class="font-bold text-[18px] text-black tracking-[-0.44px]">{{ user?.nickname ?? '테라유저' }}</p>
                      <p class="text-[12px] text-[#99a1af]">TERRAWORLD</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="rounded-[16px] flex items-center gap-1 px-2 py-[3px]"
                      style="background: rgba(153,161,175,0.1)"
                      @click="toast.info('수정은 더보기 탭에서 가능해요')"
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                        <g clip-path="url(#clip_pencil2)">
                          <path :d="feedSvg.p27b3900" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                          <path d="M7.5 2.5L9.5 4.5" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                        </g>
                        <defs><clipPath id="clip_pencil2"><rect fill="white" width="12" height="12" /></clipPath></defs>
                      </svg>
                      <span class="text-[12px] font-semibold text-black">수정</span>
                    </button>
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-[10px] font-semibold text-white"
                      style="background: black"
                      @click="toast.info('더보기 탭에서 확인하세요')"
                    >보유재화</button>
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-[10px] font-semibold text-white"
                      style="background: black"
                      @click="toast.info('더보기 탭에서 확인하세요')"
                    >도감</button>
                  </div>
                </div>

                <!-- 친구A 행 -->
                <div class="w-full rounded-[12px] flex items-center gap-3 p-3" style="background: #f9fafb">
                  <div class="size-9 rounded-full flex items-center justify-center text-lg shrink-0" style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)">🌍</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[14px] font-semibold text-[#1e2939] tracking-[-0.15px]">친구A</p>
                    <p class="text-[10px] text-[#99a1af] tracking-[0.117px]">TERRAWORLD</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-full px-2 py-1 text-[10px] font-semibold text-white shrink-0"
                    style="background: black"
                    @click="toast.info('놀러가기 준비중입니다 🚀')"
                  >놀러가기</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Onboarding (첫 방문) -->
  <CommonOnboarding :show="showOnboarding" @close="showOnboarding = false" />
</template>

<script setup lang="ts">
import type {
  AdRewardResponse,
  FreePlacementListResponse,
  HeartResponse,
  ItemListResponse,
  ItemResponse,
  TerrariumResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'
import feedSvg from '~/components/icons/jar1/feedSvg'

const { sdk, client } = useOpenApi()
const toast = useToast()
const { t } = useI18n()
const { trackHeartClick, trackShareCreated, trackScreenshotSaved, trackAdRewardClaimed, trackFreePlacementSaved } = useGtagEvents()
const { hapticImpact, share: nativeShare, shareToInstagram } = useNative()
const attendance = useAttendance()

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
const pending = ref<boolean>(true)
const fetchError = ref<Error | null>(null)
const user = ref<UserMeResponse | null>(null)
const terrarium = ref<TerrariumResponse | null>(null)
const allItems = ref<ItemResponse[]>([])
const placedItems = ref<PlacedFreeItem[]>([])

const editMode = ref<boolean>(false)
const selectedItemId = ref<number | null>(null)
const zoomLevel = ref<number>(1)

const showItemPicker = ref<boolean>(false)
const showShareDialog = ref<boolean>(false)
const showRankingDialog = ref<boolean>(false)
const showAttendance = ref<boolean>(false)
const showFreeCoinDialog = ref<boolean>(false)
const showTierModal = ref<boolean>(false)
const feedPanelOpen = ref<boolean>(false)
const showOnboarding = ref<boolean>(false)

const heartBusy = ref<boolean>(false)
const heartFloats = ref<{ id: number }[]>([])
const placementBusy = ref<boolean>(false)

// ─── Computed ───
const terrariumName = computed<string>(() => {
  const nick = user.value?.nickname
  return nick ? t('home.terrariumNameOf', { nickname: nick }) : t('home.terrariumNameDefault')
})

// 출석 (useAttendance 실 API — /rewards/attendance)
const alreadyCheckedToday = computed<boolean>(() => Boolean(attendance.state.value?.today))
const attendanceStreak = computed<number>(() => attendance.state.value?.streak ?? 0)
const attendanceReward = computed<number>(() => attendance.state.value?.rewardBasicCoins ?? 5)
const attendanceLoading = computed<boolean>(() => attendance.loading.value)
// 주간 진행 도트 표시용 (streak 을 7 주기로 환산).
const checkedCount = computed<number>(() => {
  const s = attendanceStreak.value
  const inWeek = s % 7
  // streak 이 7 의 배수이고 오늘 이미 수령이면 만근 표시.
  return (inWeek === 0 && s > 0 && alreadyCheckedToday.value) ? 7 : inWeek
})

// 보유 아이템 (아이템추가 시트) — slug 기준으로 소유 판정.
const ownedSlugs = computed<Set<string>>(() => new Set(user.value?.ownedItems ?? []))
const ownedItems = computed<ItemResponse[]>(() =>
  allItems.value.filter(item => item.slug && ownedSlugs.value.has(item.slug)),
)

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

function attDotChecked(idx: number): boolean {
  return idx < checkedCount.value
}
function attDotCurrent(idx: number): boolean {
  return idx === checkedCount.value && !alreadyCheckedToday.value
}

// ─── API 로드 ───
async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [meRes, terraRes, itemsRes, freeRes] = await Promise.all([
      sdk.getMe({ client }),
      sdk.getTerrarium({ client }),
      sdk.listItems({ client }),
      sdk.listFreePlacements({ client }),
    ])
    if (meRes.error) throw new Error(errMsg(meRes.error, 'getMe failed'))
    if (terraRes.error) throw new Error(errMsg(terraRes.error, 'getTerrarium failed'))
    if (itemsRes.error) throw new Error(errMsg(itemsRes.error, 'listItems failed'))
    if (freeRes.error) throw new Error(errMsg(freeRes.error, 'listFreePlacements failed'))

    user.value = castData<UserMeResponse>(meRes.data) ?? null
    terrarium.value = castData<TerrariumResponse>(terraRes.data) ?? null
    allItems.value = castData<ItemListResponse>(itemsRes.data)?.items ?? []

    const free = castData<FreePlacementListResponse>(freeRes.data)
    placedItems.value = (free?.items ?? []).map((it, i): PlacedFreeItem => {
      const fallback = fallbackPos(i)
      return {
        placementId: it.placementId,
        itemId: it.itemId,
        image: it.itemImage,
        name: it.itemName,
        isAnimated: false, // 자유배치 응답에 isAnimated 없음 — 아이템 카탈로그로 보강.
        // 로드 clamp 도메인 = 컨테이너 전체(0~400/0~552) — 서버 저장값(0~1) 을 손상 없이 표시.
        // 드래그 이동 중 clamp 만 EDIT 영역으로 제한(저장은 x/400·y/552 그대로). 좌표계 일관 (AW-5/VL-06).
        x: it.isFreePlacement ? clamp(it.posX * 400, 0, 400) : fallback.x,
        y: it.isFreePlacement ? clamp(it.posY * 552, 0, 552) : fallback.y,
        scale: it.scale ?? 1,
        flipped: it.flipped ?? false,
        zIndex: it.zIndex ?? i,
        rarity: 'common',
      }
    })
    // 아이템 카탈로그에서 isAnimated/rarity 보강 (자유배치 응답 미포함 필드).
    for (const p of placedItems.value) {
      const cat = allItems.value.find(it => it.id === p.itemId)
      if (cat) {
        p.isAnimated = Boolean(cat.isAnimated)
        p.rarity = (cat.rarity === 'RARE' || cat.rarity === 'EPIC') ? 'rare' : 'common'
      }
    }
  }
  catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
  finally {
    pending.value = false
  }
}

function fallbackPos(index: number): { x: number, y: number } {
  const base = DEFAULT_POSITIONS[index % DEFAULT_POSITIONS.length]!
  return { x: base.x, y: base.y }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─── 편집 모드 ───
function toggleEditMode() {
  editMode.value = !editMode.value
  showItemPicker.value = false
  selectedItemId.value = null
}

// ─── 휠 줌 (비편집 시만) ───
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
  // zoomLevel 반영해 스크린 이동량 → 컨테이너 좌표 변환.
  const dx = (e.clientX - dragState.startX) / zoomLevel.value
  const dy = (e.clientY - dragState.startY) / zoomLevel.value
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

// ─── 리사이즈 (모서리 핸들) — scale 은 세션 상태(API 미지원) ───
function onCornerPointerDown(e: PointerEvent, placed: PlacedFreeItem, dirX: number, dirY: number) {
  e.stopPropagation()
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const startX = e.clientX
  const startY = e.clientY
  const startScale = placed.scale
  const baseHalf = 26 * startScale * zoomLevel.value

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
const freePlacementNoticeShown = ref<boolean>(false)
async function persistPosition(placed: PlacedFreeItem) {
  if (!user.value?.entitlements?.freePlacement) {
    // 미보유 시 preview — 저장 시도 안 함(403 회피). 저장 불가 안내 1회.
    if (!freePlacementNoticeShown.value) {
      freePlacementNoticeShown.value = true
      toast.info('자유배치 저장은 잠금해제 후 가능해요')
    }
    return
  }
  try {
    const posX = clamp(placed.x / 400, 0, 1)
    const posY = clamp(placed.y / 552, 0, 1)
    // 낙서장 자유배치 편집 영속(req3 #2): 위치 + 크기/반전/깊이 함께 저장.
    const { error } = await sdk.updateFreePosition({
      client,
      path: { placementId: placed.placementId },
      body: { posX, posY, scale: placed.scale, flipped: placed.flipped, zIndex: placed.zIndex },
    })
    if (error) throw new Error(errMsg(error, '위치 저장 실패'))
    trackFreePlacementSaved({ itemCount: placedItems.value.length })
  }
  catch (e) {
    toast.error((e as Error).message)
  }
}

// ─── 아이템 추가 (아이템추가 시트 → 슬롯 배치 후 free-placement 재로드) ───
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
    const maxSlots = snapshot?.maxSlots ?? 6
    let freeSlot = -1
    for (let s = 0; s < maxSlots; s++) {
      if (!usedSlots.has(s)) { freeSlot = s; break }
    }
    if (freeSlot < 0) {
      toast.error('배치할 빈 자리가 없어요 — 공간을 넓혀보세요')
      return
    }
    const existing = (snapshot?.placedItems ?? []).map(p => ({ itemId: p.itemId, slotId: p.slotId ?? 0 }))
    existing.push({ itemId: item.id, slotId: freeSlot })

    const { error } = await sdk.updateTerrariumPlacements({ client, body: { placedItems: existing } })
    if (error) throw new Error(errMsg(error, '배치 실패'))

    await reloadAfterPlacement()
    showItemPicker.value = false
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

// 배치 변경 후 terrarium + free-placement 재로드 (세션 scale/flip/zIndex 는 재-초기화 — API 미영속).
async function reloadAfterPlacement() {
  const [terraRes, freeRes] = await Promise.all([
    sdk.getTerrarium({ client }),
    sdk.listFreePlacements({ client }),
  ])
  if (terraRes.data) terrarium.value = castData<TerrariumResponse>(terraRes.data) ?? terrarium.value
  const free = castData<FreePlacementListResponse>(freeRes.data)
  const prev = new Map(placedItems.value.map(p => [p.placementId, p]))
  placedItems.value = (free?.items ?? []).map((it, i): PlacedFreeItem => {
    const carry = prev.get(it.placementId)
    const fallback = fallbackPos(i)
    const cat = allItems.value.find(c => c.id === it.itemId)
    return {
      placementId: it.placementId,
      itemId: it.itemId,
      image: it.itemImage,
      name: it.itemName,
      isAnimated: Boolean(cat?.isAnimated),
      // 로드 clamp 도메인 = 컨테이너 전체(0~400/0~552), 서버값 무손상 표시 (AW-5/VL-06).
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
    if (heart && user.value) setBalance(user.value.currency, 'COIN', heart.updatedBasicCoins)
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
    // 서버 currency 로 로컬 잔액 동기화 (COIN/DEW 갱신).
    if (user.value) user.value.currency = result.currency
    const bonus = result.reward.bonus ? ` (${t('attendance.bonus')})` : ''
    toast.success(`${t('attendance.dewReward', { n: result.reward.basicCoins })}${bonus}`)
    showAttendance.value = false
  }
  else if (attendance.error.value) {
    toast.error(attendance.error.value)
  }
}

// ─── 광고 보상 (기존 로직 보존) ───
async function onClaimAdReward() {
  try {
    const { showRewardedAd, generateNonce } = useAdMob()
    const nonce = generateNonce()
    const watched = await showRewardedAd()
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
    if (ad && user.value) user.value.currency = ad.updatedCurrency
    const reward = ad?.reward.specialCoins ?? 0
    toast.success(t('home.adRewardEarned', { n: reward }))
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

function onInviteShare() {
  showShareDialog.value = false
  toast.info('초대코드 공유 준비중입니다 🚀')
}

async function onImageSave() {
  showShareDialog.value = false
  if (!import.meta.client) return
  const target = document.getElementById('my-terra-container')
  if (!target) {
    toast.error(t('home.shareAreaNotFound'))
    return
  }
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(target, { backgroundColor: '#FFF8EB', scale: 2, useCORS: true, logging: false })
    const filename = `terraworld-${Date.now()}.png`
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      toast.error(t('home.imageConvertFail'))
      return
    }
    await shareToInstagram(blob, filename, { title: 'TerraWorld', text: t('home.shareText') })
    toast.success(t('home.shareReady'))
    trackScreenshotSaved({ context: 'home' })
    trackShareCreated({ method: 'screenshot' })
  }
  catch (e) {
    toast.error(t('home.shareFail', { msg: (e as Error).message }))
  }
}

// ─── 피드 스와이프 핸들 (위로 스와이프 → 열기) ───
function onFeedHandlePointerDown(e: PointerEvent) {
  const startY = e.clientY
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  function onMove(ev: PointerEvent) {
    if (startY - ev.clientY > 30) feedPanelOpen.value = true
  }
  function onUp() {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}

// ─── mount ───
onMounted(async () => {
  if (import.meta.client && !localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)) {
    showOnboarding.value = true
  }
  await Promise.all([load(), attendance.refresh()])
})

// middleware/auth.ts 는 named middleware라 pageMeta 에 명시해야 실행된다. 이게 빠져있어서
// '/' 를 PUBLIC_EXACT 에서 제거해도 실제로는 미들웨어가 전혀 실행되지 않아 미로그인 상태에서
// 메인 화면이 그대로 렌더링되고, API 401 인터셉터가 뒤늦게 로그인으로 리다이렉트하는 flash 버그가
// 그대로 남아있었다 (Codex 감사로 발견).
definePageMeta({ layout: 'default', middleware: 'auth' })
</script>

<style scoped>
/* 하트 +1 float */
@keyframes heartFloatUp {
  0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(1.2); }
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

/* 바텀시트 slide-up */
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.28s ease; }
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel { transform: translate(-50%, 100%); }

/* 중앙 다이얼로그 spring 근사 */
.dialog-enter-active,
.dialog-leave-active { transition: opacity 0.25s ease; }
.dialog-enter-active > div:last-child,
.dialog-leave-active > div:last-child { transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1); }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; }
.dialog-enter-from > div:last-child,
.dialog-leave-to > div:last-child { transform: translateY(20px) scale(0.92); }

/* 편집 안내 fade */
.edit-fade-enter-active,
.edit-fade-leave-active { transition: opacity 0.2s ease; }
.edit-fade-enter-from,
.edit-fade-leave-to { opacity: 0; }
</style>
