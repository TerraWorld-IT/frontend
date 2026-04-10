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
        <!-- Category grid -->
        <div class="grid grid-cols-2 gap-[12px]">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="bg-white rounded-[16px] border border-black/10 p-[19px] text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            :class="selectedCategoryId === cat.id ? 'ring-2 ring-riso-pink' : ''"
            @click="selectedCategoryId = cat.id"
          >
            <div class="flex items-center gap-3 mb-[30px]">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                :style="{ backgroundColor: cat.color + '22', color: cat.color }"
              >
                {{ cat.emoji ?? '🏷️' }}
              </div>
              <div>
                <div class="font-bold text-[16px] leading-[24px] text-black tracking-[-0.31px]">
                  {{ cat.name }}
                </div>
                <div class="text-[12px] leading-[16px] text-[#737373]">
                  +{{ cat.baseTokenReward }} {{ cat.tokenName }}
                </div>
              </div>
            </div>
            <div class="text-[12px] leading-[16px] text-[#525252] flex items-center gap-1">
              <Icon name="lucide:star" class="w-3 h-3" />
              {{ cat.baseCoinReward }} 코인
            </div>
          </button>
        </div>

        <!-- Form when a category is selected -->
        <div
          v-if="selectedCategory"
          class="bg-white rounded-[16px] border border-black/10 p-5 space-y-4"
        >
          <div class="flex items-center gap-2">
            <span class="text-2xl">{{ selectedCategory.emoji ?? '🏷️' }}</span>
            <h3 class="font-bold text-lg text-black">{{ selectedCategory.name }} 기록</h3>
          </div>

          <div>
            <label for="record-duration" class="block text-sm font-semibold mb-2 text-black">
              시간 (분, 선택사항)
            </label>
            <input
              id="record-duration"
              v-model="duration"
              type="number"
              min="1"
              placeholder="예: 30"
              class="w-full h-12 rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-riso-pink"
            >
          </div>

          <div>
            <label for="record-note" class="block text-sm font-semibold mb-2 text-black">
              메모 (선택사항)
            </label>
            <textarea
              id="record-note"
              v-model="note"
              rows="3"
              placeholder="오늘의 기록을 남겨보세요..."
              class="w-full rounded-[12px] border border-black/10 bg-[#f5f5f5] px-4 py-3 text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-riso-pink resize-none"
            />
          </div>

          <button
            type="button"
            class="w-full h-12 rounded-[20px] text-white hover:opacity-90 font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style="background-color: #f092f0"
            :disabled="submitting"
            @click="onSubmit"
          >
            <Icon name="lucide:sparkles" class="w-4 h-4" />
            <span>{{ submitting ? '기록 중...' : '기록하고 보상 받기' }}</span>
          </button>
        </div>

        <!-- Recent records -->
        <div v-if="recentRecords.length > 0">
          <h3 class="font-bold mb-3 text-black">최근 기록</h3>
          <div class="space-y-2">
            <div
              v-for="record in recentRecords"
              :key="record.id"
              class="bg-white rounded-[16px] border border-black/10 p-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-12 h-12 rounded-[12px] flex items-center justify-center text-xl"
                    style="background-color: #f1c3f4"
                  >
                    {{ record.categoryEmoji ?? '🏷️' }}
                  </div>
                  <div>
                    <div class="font-semibold text-sm text-black">{{ record.categoryName }}</div>
                    <div class="text-xs text-[#525252]">
                      {{ formatRecordedDate(record) }}
                    </div>
                  </div>
                </div>
                <div v-if="record.duration" class="text-sm font-semibold text-[#525252]">
                  {{ record.duration }}분
                </div>
              </div>
              <div v-if="record.memo" class="mt-3 text-sm text-[#525252] pl-[60px]">
                {{ record.memo }}
              </div>
            </div>
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
  CategoryResponse,
  RecordResponse,
} from '@terraworld-it/openapi-frontend'

definePageMeta({ layout: 'default' })

const { sdk, client } = useOpenApi()
const toast = useToast()

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

const selectedCategory = computed(
  () => categories.value.find((c) => c.id === selectedCategoryId.value) ?? null,
)

function pickErrorMessage(e: unknown, fallback: string): string {
  if (
    e
    && typeof e === 'object'
    && 'message' in e
    && typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return fallback
}

function formatRecordedDate(r: RecordResponse): string {
  const src = r.recordedDate || r.createdAt
  const d = new Date(src)
  if (Number.isNaN(d.getTime())) return src
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`
}

async function load() {
  pending.value = true
  fetchError.value = null
  try {
    const [catRes, recRes] = await Promise.all([
      sdk.listCategories({ client }),
      sdk.listRecords({ client, query: { page: 0, size: 5 } }),
    ])
    if (catRes.error) {
      throw new Error(pickErrorMessage(catRes.error, 'listCategories failed'))
    }
    if (recRes.error) {
      throw new Error(pickErrorMessage(recRes.error, 'listRecords failed'))
    }
    categories.value = catRes.data?.categories ?? []
    recentRecords.value = recRes.data?.content ?? []
  }
 catch (e) {
    fetchError.value = e as Error
    toast.error((e as Error).message)
  }
 finally {
    pending.value = false
  }
}

async function onSubmit() {
  if (selectedCategoryId.value === null || submitting.value) return
  submitting.value = true
  try {
    const body = {
      categoryId: selectedCategoryId.value,
      duration: duration.value ? Number(duration.value) : null,
      note: note.value || null,
    }
    const { data, error } = await sdk.createRecord({ client, body })
    if (error) {
      throw new Error(pickErrorMessage(error, '기록 생성 실패'))
    }
    if (data) {
      recentRecords.value = [data.record, ...recentRecords.value].slice(0, 5)
      const rew = data.reward
      toast.success(
        `+${rew.basicCoins.toFixed(1)} 코인, +${rew.categoryTokens.toFixed(1)} 토큰`,
      )
    }
    duration.value = ''
    note.value = ''
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
      throw new Error(pickErrorMessage(error, '초대 링크 생성 실패'))
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
