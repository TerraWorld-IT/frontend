<!--
  홈 화면 — TERRAWORLD2 Figma 프로토타입 `MyTerra.tsx` 픽셀-정확 이식.
  실 데이터 배선: getMe / getTerrarium / listItems / listFreePlacements 병렬 로드,
  하트(clickTerrariumHeart) / 광고보상(claimAdReward) / 출석(useAttendance) / 공유(html2canvas)
  / 자유배치 드래그(updateFreePosition) 실 API. scale/flip/zIndex 는 API 미지원 → 클라 세션 상태.
-->
<template>
  <div class="flex flex-col gap-6 min-h-screen w-full px-4 pt-4 pb-24">
    <!-- Loading -->
    <CommonLoading v-if="pending" variant="skeleton" container-class="py-8" />

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
        <!-- min-w-0 + truncate: 제목이 음절 사이에서 줄바꿈되면(한글은 단어 경계가 없다) 헤더가
             2행이 되어 오른쪽 버튼 그룹과 세로로 겹친다. truncate 가 nowrap 을 포함해 줄바꿈을
             막고, min-w-0 는 아주 긴 닉네임일 때 가로 오버플로 대신 말줄임으로 처리한다. -->
        <div class="flex flex-col items-start gap-1 min-w-0">
          <div class="font-bold text-lg text-black truncate max-w-full">{{ terrariumName }}</div>
          <!-- whitespace-nowrap: 좁은 뷰포트에서 "테라리움 관리하기"가 2줄 wrap 되던 문제
               (2026-07-20 시각검증 실측, § UI Breakage #3) -->
          <button
            type="button"
            class="h-10 flex items-center gap-1.5 text-xs font-semibold px-3 rounded-lg transition-all active:scale-95 whitespace-nowrap"
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
            <!-- 2. 광고 — 실 광고를 띄울 수 있는 플랫폼(Android 네이티브)에서만 노출.
                 웹/iOS 프로덕션은 광고 없이 보상만 청구되던 fail-open 진입점이었다
                 (audit B2-3). dev 빌드는 플로우 테스트용으로 허용. -->
            <button
              v-if="adAvailable"
              type="button"
              data-testid="home-freecoin"
              class="h-10 w-10 rounded-lg flex items-center justify-center transition-colors"
              style="background: rgba(140,106,228,0.4)"
              :aria-label="$t('home.ariaFreeCoin')"
              @click="showFreeCoinDialog = true"
            >
              <Icon name="lucide:gift" class="w-4 h-4 text-white" />
            </button>
            <!-- 3. 랭킹 — 실 랭킹 페이지로 이동 (구 "준비중" 팝업은 /ranking 실페이지와 상반된
                 dead-end 이라 제거, 2026-07-20 audit A2-1) -->
            <button
              type="button"
              data-testid="home-ranking"
              class="h-10 w-10 rounded-lg flex items-center justify-center transition-colors"
              style="background: rgba(252,238,90,0.5)"
              aria-label="랭킹"
              @click="navigateTo('/ranking')"
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
      <!-- 스테이지는 항상 설계 기준 400×552 를 유지(shrink-0)하고 uniform scale 로 화면에 맞춘다.
           이전에는 flex 축소로 스테이지 폭만 줄어(예: 376px) %-inset 병 아트는 세로로 왜곡되고
           px 좌표계(편집존·아이템 x/y·posX 저장 /400)와 기준이 어긋났다 (2026-07-20 라이브 실측). -->
      <div
        id="my-terra-container"
        ref="stageEl"
        class="relative flex justify-center w-full overflow-hidden"
        :style="{ cursor: editMode ? 'default' : 'grab', paddingTop: '1.3rem', paddingBottom: '1.3rem' }"
        @wheel="onWheel"
      >
        <div
          class="transition-transform duration-200 ease-out relative shrink-0"
          :style="{
            transform: `scale(${zoomLevel * stageFit})`,
            transformOrigin: 'top center',
            width: '400px',
            height: '552px',
            marginBottom: `${-552 * (1 - stageFit)}px`,
          }"
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
            >
              <!-- 빈 병 첫 편집 안내 — 배치 아이템이 없으면 다음 행동(아이템추가)을 알려준다.
                   반투명 pill 배경: 병 하단 어두운 모래 영역과 겹칠 때 텍스트 대비 확보
                   (2026-07-20 시각검증 실측) -->
              <p
                v-if="placedItems.length === 0"
                class="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-[13px] font-semibold rounded-xl px-3 py-2 mx-auto w-fit"
                style="color: #2e7d5f; background: rgba(255,255,255,0.82)"
              >
                위의 '아이템추가' 버튼으로<br>첫 아이템을 배치해 보세요
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
  <CommonBottomSheet :open="showItemPicker" ariaLabel="아이템 선택" @close="showItemPicker = false">
    <div class="px-5 pb-3 pt-3">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-base" style="color: #3a9e78">아이템 추가</h3>
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
  </CommonBottomSheet>

  <!-- ═══════════════ 공유하기 바텀시트 ═══════════════ -->
  <CommonBottomSheet :open="showShareDialog" ariaLabel="공유" @close="showShareDialog = false">
    <div class="px-5 pb-5 pt-4">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-base text-gray-800 flex items-center gap-2">
          <Icon name="lucide:share-2" class="w-4 h-4" />
          공유하기
        </h3>
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
        <!-- 인스타 스토리 (네이티브 전용 — 투명 스티커를 스토리 카메라 위에) -->
        <button
          v-if="storyShareAvailable"
          type="button"
          class="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
          style="background: linear-gradient(135deg,#fdf2f8,#fce7f3); border: 1.5px solid rgba(240,146,240,0.35)"
          :disabled="capturingImage"
          @click="onInstagramStoryShare"
        >
          <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(240,146,240,0.2)">
            <Icon name="lucide:instagram" class="w-5 h-5" style="color: #f092f0" />
          </div>
          <div class="text-left">
            <div class="text-sm font-semibold text-gray-800">인스타 스토리에 올리기</div>
            <div class="text-xs text-gray-400">테라리움 스티커를 스토리 카메라 위에 올려요</div>
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
          class="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
          style="background: linear-gradient(135deg,#f0fff4,#e8f5ff); border: 1.5px solid rgba(126,219,192,0.3)"
          :disabled="capturingImage"
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
  </CommonBottomSheet>

  <!-- ═══════════════ 출석체크 팝업 ═══════════════ -->
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="showAttendance" ref="attendanceRoot" class="fixed inset-0 z-[9997]" role="dialog" aria-modal="true" aria-label="출석체크">
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
      <div v-if="feedPanelOpen" ref="feedPanelRoot" class="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="피드">
        <div class="fixed inset-0 bg-black/20" @click="feedPanelOpen = false" />
        <!-- 모달 시트(role=dialog, aria-modal)는 뷰포트 하단에 밀착해 바텀 nav 를 덮는다.
             백드롭이 nav 를 가리면서 패널만 nav 위에 떠 있으면, nav 가 "보이지만 눌리지 않는"
             상태가 된다(탭이 백드롭에 먹혀 시트가 닫힘). 같은 파일의 아이템 선택/공유 시트도
             bottom-0 이며, Material 3·Apple HIG 모두 모달 시트가 하단 내비를 덮도록 규정한다. -->
        <div class="sheet-panel fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col">
          <!-- max-height/overflow-y-auto 로 콘텐츠가 뷰포트를 넘겨도 스크롤 가능(이전엔 overflow-hidden
               이라 넘치는 콘텐츠가 그냥 잘려 도달 불가능했다). 상단 여백은 아이템 선택 시트와 동일 규약. -->
          <div
            class="rounded-tl-[24px] rounded-tr-[24px] flex flex-col overflow-y-auto"
            style="background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); box-shadow: 0px -8px 25px rgba(0,0,0,0.15); max-height: calc(100dvh - 98px - 20px)"
          >
            <div
              class="flex justify-center pt-3 pb-1 cursor-grab"
              style="touch-action: none"
              @pointerdown="onFeedPanelHandlePointerDown"
            >
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
            <!-- 시트가 뷰포트 하단을 소유하므로 홈 인디케이터 영역만큼 바닥 여백을 더 준다. -->
            <div class="flex flex-col gap-5 px-5" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))">
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

                <!-- 친구 행 — 실 친구 목록 (구 "친구A" 정적 목업 대체, audit A1-7) -->
                <div v-if="feedFriendsLoading" class="w-full rounded-[12px] p-3 text-center" style="background: #f9fafb">
                  <p class="text-[12px] text-[#99a1af]">친구 목록 불러오는 중…</p>
                </div>
                <template v-else-if="feedFriends.length > 0">
                  <div
                    v-for="friend in feedFriends"
                    :key="friend.userId"
                    class="w-full rounded-[12px] flex items-center gap-3 p-3"
                    style="background: #f9fafb"
                  >
                    <div class="size-9 rounded-full flex items-center justify-center text-lg shrink-0" style="background: linear-gradient(135deg,#e8f0ff,#f5e8ff)">🌍</div>
                    <div class="flex-1 min-w-0">
                      <p class="text-[14px] font-semibold text-[#1e2939] tracking-[-0.15px] truncate">{{ friend.nickname }}</p>
                      <p class="text-[10px] text-[#99a1af] tracking-[0.117px]">TERRAWORLD</p>
                    </div>
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-[10px] font-semibold text-white shrink-0"
                      style="background: black"
                      @click="navigateTo('/friends')"
                    >놀러가기</button>
                  </div>
                </template>
                <div v-else class="w-full rounded-[12px] flex items-center justify-between gap-3 p-3" style="background: #f9fafb">
                  <p class="text-[12px] text-[#99a1af]">{{ feedFriendsError ? '친구 목록을 불러오지 못했어요' : '아직 함께하는 친구가 없어요' }}</p>
                  <button
                    type="button"
                    class="rounded-full px-2 py-1 text-[10px] font-semibold text-white shrink-0"
                    style="background: black"
                    @click="navigateTo('/friends')"
                  >{{ feedFriendsError ? '친구 페이지로' : '친구 초대하기' }}</button>
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
import { Capacitor } from '@capacitor/core'
import type {
  AdRewardResponse,
  FreePlacementListResponse,
  HeartResponse,
  ItemResponse,
  TerrariumResponse,
  UserMeResponse,
} from '@terraworld-it/openapi-frontend'
import feedSvg from '~/components/icons/jar1/feedSvg'
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

const showItemPicker = ref<boolean>(false)
const showShareDialog = ref<boolean>(false)
const showAttendance = ref<boolean>(false)
const showFreeCoinDialog = ref<boolean>(false)
// 광고 진입점 가용성 — SSR 은 항상 숨김, 클라 마운트 후 판정(하이드레이션 mismatch 회피).
const adAvailable = ref<boolean>(false)
onMounted(() => {
  const { isNative: adNative, isAndroid: adAndroid } = useAdMob()
  adAvailable.value = (adNative && adAndroid) || import.meta.dev
})
const showTierModal = ref<boolean>(false)
const feedPanelOpen = ref<boolean>(false)
const showOnboarding = ref<boolean>(false)

// 피드 패널 친구 목록 — 패널 첫 오픈 시 1회 lazy load (구 "친구A" 정적 목업 대체, audit A1-7).
interface FeedFriend { userId: string, nickname: string }
const feedFriends = shallowRef<FeedFriend[]>([])
const feedFriendsLoading = ref<boolean>(false)
const feedFriendsError = ref<boolean>(false)
let feedFriendsLoaded = false
watch(feedPanelOpen, async (open) => {
  if (!open || feedFriendsLoaded) return
  feedFriendsLoading.value = true
  feedFriendsError.value = false
  try {
    const { data, error } = await sdk.listFriends({ client })
    if (error) throw error
    feedFriends.value = (castData<FeedFriend[]>(data) ?? []).slice(0, 5)
    feedFriendsLoaded = true
  }
  catch {
    // 실패는 빈 상태로 위장하지 않고 구분 표시 — 다음 패널 오픈 시 재시도된다.
    feedFriendsError.value = true
  }
  finally {
    feedFriendsLoading.value = false
  }
})

// Android 하드웨어 뒤로가기 — CommonModal 을 거치지 않는 이 페이지의 bespoke 오버레이(Teleport
// v-if 패널)들은 각자 back-stack 에 직접 등록해야 뒤로가기가 라우트 이동/앱종료 대신 오버레이부터
// 닫는다(showFreeCoinDialog 는 CommonModal 사용이라 Modal.vue 쪽에서 이미 처리됨 — 중복 등록 방지).
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
  // Codex 감사 지적 — 오버레이가 열린 채로 라우트 이탈(딥링크/탭 네비게이션)해 이 페이지가
  // unmount 되면 watch 의 close 분기가 안 돌아 스택에 stale handler 가 영구히 남는다.
  onBeforeUnmount(() => {
    unregister?.()
    unregister = null
  })
}
// bespoke 오버레이 role="dialog" aria-modal="true" 에 실제 focus trap 부여(Codex Round 3 지적 —
// aria-modal 선언만 하고 focus containment 가 없으면 스크린리더에 거짓 계약이 됨).
// 아이템추가/공유 시트는 CommonBottomSheet 가 focus trap + 뒤로가기 + ESC 를 내장 처리하므로
// 여기 등록하지 않는다(이중 등록 금지).
const attendanceRoot = ref<HTMLElement | null>(null)
const feedPanelRoot = ref<HTMLElement | null>(null)
useDialogFocusTrap(attendanceRoot, showAttendance, () => { showAttendance.value = false })
useDialogFocusTrap(feedPanelRoot, feedPanelOpen, () => { feedPanelOpen.value = false })

registerOverlayBackClose(showAttendance)
registerOverlayBackClose(feedPanelOpen)

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
// 되돌리지 않게 하고, 편집 종료 시점에 최신 스냅샷을 반영한다 (Codex 리뷰).
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
    // 저장 전 진행 중 snapshot fetch 를 세대 무효화 — 저장 완료 전에 도착하는 stale GET 이
    // 스토어에 커밋되어 이 편집을 되돌리는 race 차단 (Codex 리뷰).
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
    // 먼저 렌더되고 후속 편집이 그 stale 값을 재전송할 수 있다 (Codex 리뷰).
    homeSnapshot.patchFreePlacement(placed.placementId, {
      posX,
      posY,
      scale: placed.scale,
      flipped: placed.flipped,
      zIndex: placed.zIndex,
    })
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
    // 서버 currency 로 잔액 동기화 (COIN/DEW 갱신) — 스토어에 반영해 다른 화면과 공유한다.
    userStore.updateCurrency(result.currency)
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
  // 다이얼로그가 즉시 닫혀 같은 버튼 재클릭은 막히지만, 사용자가 공유 다이얼로그를 다시 열어
  // capture 가 끝나기 전에 "이미지 저장"을 또 누르는 재진입은 막히지 않는다(Codex 감사 지적).
  if (capturingImage.value) return
  showShareDialog.value = false
  if (!import.meta.client) return
  capturingImage.value = true
  // Codex R1 #5: 바깥 컨테이너(w-full overflow-hidden)를 캡처하면 onclone 의 scale(1) 원복 후
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
        // Codex R1 #6: withTimeout 은 race 만 끊고 html2canvas 자체는 취소 못 한다 —
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
    // false 를 돌려준다 — 여기서 성공 토스트/추적이 실패 뒤에도 나가지 않도록 분기(Codex 감사 지적).
    const ok = await shareToInstagram(blob, filename, { title: 'TerraWorld', text: t('home.shareText') })
    if (!ok) return
    toast.success(t('home.shareReady'))
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

// ─── 인스타 스토리 공유 (2026-07-21 — Codex 설계 [B]) ───
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
    // 미설치/미설정/실패 — 기존 시스템 공유 시트로 폴백 (폴백 제거 금지, Codex 설계 [B]).
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

// ─── 피드 패널 내부 핸들 (아래로 스와이프 → 닫기) ───
// 열기(onFeedHandlePointerDown)의 대칭 — 시각적으로 스와이프 가능하다고 암시하는 핸들 바가
// 실제로는 아무 동작도 하지 않던 문제(전수 UX 점검에서 발견). 열기와 동일한 임계값(30px).
function onFeedPanelHandlePointerDown(e: PointerEvent) {
  const startY = e.clientY
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  function onMove(ev: PointerEvent) {
    if (ev.clientY - startY > 30) feedPanelOpen.value = false
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

/* 바텀시트 slide-up.
   Tailwind v4 의 `-translate-x-1/2` 는 `transform` 이 아니라 개별 `translate` 속성을 내보낸다
   (`translate: var(--tw-translate-x) var(--tw-translate-y)`). CSS 는 개별 translate 를 먼저 적용한 뒤
   transform 을 합성하므로, 여기서 transform 에 X 축을 또 넣으면 -50% 가 두 번 걸려 패널이 자기 폭만큼
   왼쪽(-100%)에서 대각선으로 날아든다. X 중앙정렬은 translate 에 맡기고 transform 은 Y 축만 다룬다.
   root(.sheet-enter-active)의 duration 이 Vue 의 transition 종료 판정 기준이므로 패널과 같게 맞춘다. */
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.3s ease; }
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel { transform: translateY(100%); }

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel { transition-duration: 0.01ms; }
}

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
