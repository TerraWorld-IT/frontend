import { authClient } from '~/lib/auth-client'
import { useUserStore } from '~/stores/user'

/** 차단한 회원 한 명 — 닉네임은 차단 당시 화면에 보이던 표시(전체 랭킹이면 가린 표시)를 그대로 둔다. */
export interface BlockedUser {
  userId: string
  nickname: string
  blockedAt: string
}

/** 로그인 회원별 차단 목록 저장 키 접두사 — 계정 삭제 시 이 접두사로 기기 내 목록을 지운다. */
export const BLOCKS_STORAGE_PREFIX = 'tw.blocks.'

function isBlockedUser(value: unknown): value is BlockedUser {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.userId === 'string' && v.userId.length > 0
    && typeof v.nickname === 'string' && typeof v.blockedAt === 'string'
}

/** 저장소 차단·잘못된 JSON 은 빈 목록으로 본다. 형식이 어긋난 항목만 버린다. */
function readBlocks(ownerId: string): BlockedUser[] {
  try {
    const raw = localStorage.getItem(BLOCKS_STORAGE_PREFIX + ownerId)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isBlockedUser) : []
  }
  catch {
    return []
  }
}

/** 저장 성공 여부를 돌려준다. 실패해도 화면 숨김은 이번 실행 동안 메모리 상태로 유지된다. */
function writeBlocks(ownerId: string, list: BlockedUser[]): boolean {
  try {
    if (list.length) localStorage.setItem(BLOCKS_STORAGE_PREFIX + ownerId, JSON.stringify(list))
    else localStorage.removeItem(BLOCKS_STORAGE_PREFIX + ownerId)
    return true
  }
  catch {
    return false
  }
}

/**
 * 회원 차단 (App Store 가이드라인 1.2 — 사용자 차단 수단).
 *
 * 차단은 이 기기의 로컬 저장소에 로그인 회원 ID 별로 저장하는 앱 내 기능이다. 서버로 보내지 않고 상대방에게 알리지 않으며,
 * 차단한 회원을 친구 목록·홈 친구 목록·랭킹·습관 친구 선택·방문 화면에서 숨긴다(목록은 `filterBlocked` 로 거른다).
 *
 * 로그인 회원 ID 는 사용자 정보 스토어를 우선하고, 비어 있으면 세션의 사용자 ID 를 쓴다.
 * 상태는 `useState` 로 컴포넌트 사이에 공유해 한 화면에서 차단하면 다른 화면의 목록도 즉시 바뀐다.
 * 서버 렌더에서는 저장소가 없으므로 비어 있고, 클라이언트에서 로그인 회원 ID 가 정해지면 그 회원의 목록을 읽는다.
 */
export function useUserBlocks() {
  const userStore = useUserStore()
  const blocksByOwner = useState<Record<string, BlockedUser[]>>('tw-user-blocks', () => ({}))
  // 사용자 정보 스토어가 아직 비어 있어도(기록 화면 직접 진입 등) 세션의 사용자 ID 로 차단 목록을 적용한다.
  // 세션 JWT 의 sub 는 서버의 회원 ID 와 같은 값이다(server/lib/auth.ts).
  const session = authClient.useSession()
  const ownerId = computed<string | null>(() => userStore.me?.userId ?? session.value?.data?.user?.id ?? null)

  // clearNuxtState 로 비워진 뒤에도(undefined) 빈 목록으로 다룬다.
  function ensureLoaded(owner: string | null): void {
    if (!owner || !import.meta.client || owner in (blocksByOwner.value ?? {})) return
    blocksByOwner.value = { ...blocksByOwner.value, [owner]: readBlocks(owner) }
  }
  watch(ownerId, ensureLoaded, { immediate: true })

  const blockedUsers = computed<BlockedUser[]>(() => (ownerId.value ? blocksByOwner.value?.[ownerId.value] ?? [] : []))
  const blockedIds = computed<Set<string>>(() => new Set(blockedUsers.value.map(b => b.userId)))

  function isBlocked(userId: string | null | undefined): boolean {
    return !!userId && blockedIds.value.has(userId)
  }

  /** 차단한 회원을 뺀 목록 — 원본 배열 원소를 그대로 돌려줘 행 객체의 반응성을 유지한다. */
  function filterBlocked<T extends { userId: string }>(list: readonly T[]): T[] {
    return blockedIds.value.size ? list.filter(item => !blockedIds.value.has(item.userId)) : [...list]
  }

  function commit(owner: string, list: BlockedUser[]): boolean {
    blocksByOwner.value = { ...blocksByOwner.value, [owner]: list }
    return writeBlocks(owner, list)
  }

  /**
   * 차단 목록에 추가한다. 로그인 회원을 알 수 없거나 자기 자신이면 추가하지 않는다.
   * 반환값 `saved` 가 false 면 기기 저장에 실패해 앱을 다시 열면 풀릴 수 있다는 뜻이다(화면 숨김은 지금 바로 적용된다).
   */
  function block(target: { userId: string, nickname: string }): { added: boolean, saved: boolean } {
    const owner = ownerId.value
    if (!owner || !target.userId || target.userId === owner) return { added: false, saved: false }
    ensureLoaded(owner)
    if (isBlocked(target.userId)) return { added: false, saved: true }
    const entry: BlockedUser = { userId: target.userId, nickname: target.nickname, blockedAt: new Date().toISOString() }
    return { added: true, saved: commit(owner, [...blockedUsers.value, entry]) }
  }

  /** 차단을 해제한다. 저장에 실패하면 false. */
  function unblock(userId: string): boolean {
    const owner = ownerId.value
    if (!owner) return false
    ensureLoaded(owner)
    return commit(owner, blockedUsers.value.filter(b => b.userId !== userId))
  }

  return { ownerId, blockedUsers, isBlocked, filterBlocked, block, unblock }
}
