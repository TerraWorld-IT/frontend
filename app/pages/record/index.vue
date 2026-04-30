<template>
  <div class="riso-grain min-h-screen space-y-[30px] pb-4">
    <!-- Initial loading (categories) -->
    <CommonLoading v-if="pending" variant="spinner" container-class="py-24" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex flex-col items-center py-24 gap-3">
      <p class="text-riso-poppy font-medium">불러오기 실패</p>
      <p class="text-xs text-riso-dark/60">{{ fetchError.message }}</p>
      <button
        class="mt-2 px-4 py-2 rounded-full bg-riso-pink text-white text-sm riso-shadow-sm"
        @click="load"
      >
        다시 시도
      </button>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="space-y-1">
        <h2 class="font-bold text-[20px] leading-[28px] text-black tracking-[-0.45px]">
          행동 기록하기
        </h2>
        <p class="text-[14px] leading-[20px] text-[#525252] tracking-[-0.15px]">
          일상의 행동을 기록하고 보상을 받아보세요
        </p>
      </div>

      <!-- Record type toggle -->
      <div class="flex gap-[8px]">
        <button
          type="button"
          class="flex-1 h-[48px] rounded-[20px] flex items-center justify-center gap-2 transition-all font-semibold text-[14px] leading-[20px] tracking-[-0.15px]"
          :class="[
            recordType === 'solo'
              ? 'text-white shadow-lg'
              : 'bg-white text-black border border-black/10',
          ]"
          :style="recordType === 'solo' ? { backgroundColor: '#f092f0' } : {}"
          @click="recordType = 'solo'"
        >
          <Icon name="lucide:sparkles" class="w-4 h-4" />
          <span>기록</span>
        </button>
        <button
          type="button"
          class="flex-1 h-[48px] rounded-[20px] flex items-center justify-center gap-2 transition-all font-semibold text-[14px] leading-[20px] tracking-[-0.15px]"
          :class="[
            recordType === 'friend'
              ? 'text-white shadow-lg'
              : 'bg-white text-black border border-black/10',
          ]"
          :style="recordType === 'friend' ? { backgroundColor: '#f092f0' } : {}"
          @click="recordType = 'friend'"
        >
          <Icon name="lucide:users" class="w-4 h-4" />
          <span>친구와 함께 기록</span>
        </button>
      </div>

      <!-- Solo -->
      <template v-if="recordType === 'solo'">
        <RecordCategoryGrid v-model="selectedCategoryId" :categories="categories" />

        <RecordRecordForm
          :category="selectedCategory"
          :duration="duration"
          :note="note"
          :submitting="submitting"
          @update:duration="duration = $event"
          @update:note="note = $event"
          @submit="onSubmit"
        />

        <!-- 사진 첨부 (선택) -->
        <div class="bg-white rounded-[16px] border border-black/10 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-[13px] font-semibold text-black">
              사진 첨부 <span class="text-[11px] font-normal text-[#737373]">(선택)</span>
            </p>
            <button
              v-if="photoUrl"
              type="button"
              class="text-[12px] text-riso-poppy underline"
              @click="onClearPhoto"
            >
              제거
            </button>
          </div>
          <button
            v-if="!photoUrl"
            type="button"
            class="w-full h-11 rounded-[12px] border border-dashed border-black/20 text-[13px] font-medium text-[#525252] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            :disabled="uploadingPhoto"
            @click="fileInputRef?.click()"
          >
            <Icon name="lucide:camera" class="w-4 h-4" />
            <span>{{ uploadingPhoto ? '업로드 중...' : '사진 추가' }}</span>
          </button>
          <img
            v-else
            :src="photoUrl"
            alt="첨부 사진 미리보기"
            class="w-full max-h-[240px] object-cover rounded-[12px] riso-shadow-sm"
          >
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            class="hidden"
            @change="onFileSelected"
          >
        </div>

        <div v-if="recentRecords.length > 0">
          <h3 class="font-bold mb-3 text-black">최근 기록</h3>
          <div class="space-y-2">
            <RecordRecordCard
              v-for="record in recentRecords"
              :key="record.id"
              :record="record"
            />
          </div>
        </div>
      </template>

      <!-- Friend -->
      <template v-else>
        <div class="bg-white rounded-[16px] border border-black/10 p-8 text-center space-y-6">
          <div class="flex justify-center">
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center"
              style="background-color: #f1c3f4"
            >
              <Icon name="lucide:users" class="w-10 h-10" style="color: #f092f0" />
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="text-xl font-bold text-black">친구와 함께 기록하기</h3>
            <p class="text-sm text-[#525252]">
              친구를 초대하여 함께 활동을 기록하고<br>
              더 많은 보상을 받아보세요!
            </p>
          </div>

          <div class="rounded-[16px] p-4 space-y-2" style="background-color: #f1c3f4">
            <div class="text-sm font-bold text-black">함께하면 더 즐거운 테라월드</div>
            <div class="text-sm text-[#525252]">스페셜 코인 획득 가능!</div>
          </div>

          <button
            type="button"
            class="w-full h-12 rounded-[20px] text-white hover:opacity-90 font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style="background-color: #f092f0"
            :disabled="invitePending"
            @click="onInvite"
          >
            <Icon name="lucide:user-plus" class="w-4 h-4" />
            <span>{{ invitePending ? '링크 생성 중...' : '친구 초대하기' }}</span>
          </button>

          <div class="text-xs text-[#737373]">
            초대 링크를 통해 친구가 가입하면<br>
            양쪽 모두 특별 보상을 받을 수 있습니다
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  CategoryListResponse,
  CategoryResponse,
  CreateRecordResponse,
  PagedRecordResponse,
  RecordResponse,
} from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { sdk, client } = useOpenApi()
const toast = useToast()
const { trackRecordCreated } = useGtagEvents()

const pending = ref(true)
const fetchError = ref<Error | null>(null)
const categories = ref<CategoryResponse[]>([])
const recentRecords = ref<RecordResponse[]>([])
const recordType = ref<'solo' | 'friend'>('solo')
const selectedCategoryId = ref<number | null>(null)
const duration = ref('')
const note = ref('')
const submitting = ref(false)
const invitePending = ref(false)

// 사진 첨부 — POST /uploads/photo 응답의 photoUrl 보관. 저장 시 createRecord body 에 포함.
const photoUrl = ref<string>('')
const uploadingPhoto = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const selectedCategory = computed(
  () => categories.value.find((c) => c.id === selectedCategoryId.value) ?? null,
)

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [catRes, recRes] = await Promise.all([
      sdk.listCategories({ client }),
      sdk.listRecords({ client, query: { page: 0, size: 5 } }),
    ])
    if (catRes.error) {
      throw new Error(errMsg(catRes.error, 'listCategories failed'))
    }
    if (recRes.error) {
      throw new Error(errMsg(recRes.error, 'listRecords failed'))
    }
    categories.value = castData<CategoryListResponse>(catRes.data)?.categories ?? []
    recentRecords.value = castData<PagedRecordResponse>(recRes.data)?.content ?? []
  }
 catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
 finally {
    pending.value = false
  }
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingPhoto.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    // 인증 헤더는 plugins/openapi.ts 의 인터셉터가 자동 주입.
    // SDK 자동 생성 전이라 client 의 generic POST 사용. spec sync 후 sdk.uploadPhoto 로 마이그레이션.
    const { data: result, error } = await client.post({
      url: '/uploads/photo',
      body: formData,
    })
    if (error) throw new Error(errMsg(error, '업로드 실패'))
    const typed = result as { photoUrl?: string } | undefined
    if (!typed?.photoUrl) throw new Error('photoUrl 누락')

    photoUrl.value = typed.photoUrl
    toast.success('사진이 업로드되었어요')
  }
  catch (e) {
    toast.error(`업로드 실패: ${(e as Error).message}`)
  }
  finally {
    uploadingPhoto.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

function onClearPhoto() {
  photoUrl.value = ''
}

async function fireSavedConfetti() {
  if (!import.meta.client) return
  try {
    const { default: confetti } = await import('canvas-confetti')
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#7B9E6B', '#E8A0BF', '#F4E4BA', '#A8D8EA'],
      ticks: 200,
      gravity: 0.8,
    })
  }
 catch {
    // canvas-confetti 미설치 시 토스트만 노출 — silent fallback
  }
}

async function onSubmit() {
  if (selectedCategoryId.value === null || submitting.value) return
  submitting.value = true
  try {
    // photoUrl 은 spec sync 후 generated DTO 에 포함되지만 현재는 type 가 없어 cast 사용.
    // BE 의 ActivityRecord 엔티티에는 photo_url 컬럼 추가 (V7 마이그레이션) 완료.
    const body = {
      categoryId: selectedCategoryId.value,
      duration: duration.value ? Number(duration.value) : null,
      note: note.value || null,
      ...(photoUrl.value ? { photoUrl: photoUrl.value } : {}),
    } as Parameters<typeof sdk.createRecord>[0]['body']
    const { data, error } = await sdk.createRecord({ client, body })
    if (error) {
      throw new Error(errMsg(error, '기록 생성 실패'))
    }
    const created = castData<CreateRecordResponse>(data)
    if (created) {
      recentRecords.value = [created.record, ...recentRecords.value].slice(0, 5)
      const rew = created.reward
      trackRecordCreated({
        categoryId: selectedCategoryId.value!,
        categoryName: selectedCategory.value?.name ?? '',
        basicCoins: rew.basicCoins,
        categoryTokens: rew.categoryTokens,
        experienceGained: rew.experienceGained,
      })
      toast.success(
        `+${rew.basicCoins.toFixed(1)} 코인, +${rew.categoryTokens.toFixed(1)} 토큰`,
      )
      fireSavedConfetti()
    }
    duration.value = ''
    note.value = ''
    photoUrl.value = ''
    selectedCategoryId.value = null
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    submitting.value = false
  }
}

async function onInvite() {
  if (invitePending.value) return
  invitePending.value = true
  try {
    const { data, error } = await sdk.createInvite({ client })
    if (error) {
      throw new Error(errMsg(error, '초대 링크 생성 실패'))
    }
    const raw = data as unknown
    const inviteCode
      = raw && typeof raw === 'object' && 'inviteCode' in raw
        ? String((raw as { inviteCode: unknown }).inviteCode)
        : ''
    const link = inviteCode
      ? `${window.location.origin}/invite/${inviteCode}`
      : window.location.origin
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link)
      toast.success('초대 링크가 복사되었습니다!')
    }
 else {
      toast.info(`초대 링크: ${link}`)
    }
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    invitePending.value = false
  }
}

onMounted(load)
</script>
