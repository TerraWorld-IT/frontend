import type { BrowserContext } from '@playwright/test'
import type { InviteResponse } from '@terraworld-it/openapi-frontend'

// e2e/safe-area.spec.ts의 세션·인증·API 픽스처를 최소 복제하고 감사 하네스의 밀집 데이터를 적용한다.
const currency = {
  balances: ['COIN', 'RUBY', 'SPARKLE', 'DEW', 'SUN', 'BOLT', 'WIND']
    .map(code => ({ code, amount: 9999999 })),
}

const user = {
  userId: 'layout-user',
  email: 'layout@example.com',
  nickname: '가나다라마바사아자차카타파하가나다라마바',
  role: 'USER',
  currency,
  ownedItems: [],
  placedItems: [],
  entitlements: { freePlacement: false, premiumThemes: false },
}

const itemSlugs = [
  'dischidia', 'humata-fern', 'jeju-creeping-fig', 'nandina', 'pilea-peperomioides',
  'pteris', 'scindapsus', 'red-star', 'round-leaf-acacia', 'stephania',
  'tillandsia-ionantha', 'weed', 'wind-orchid',
]
const items = Array.from({ length: 60 }, (_, index) => ({
  id: index + 1,
  slug: itemSlugs[index % itemSlugs.length],
  name: `테스트 식물 ${index + 1}`,
  description: '레이아웃 픽스처',
  categoryId: 1,
  categoryName: '식물',
  priceType: 'BASIC',
  priceAmount: 9999999,
  tokenPrice: null,
  rarity: 'COMMON',
  assetUrl: `/items/${itemSlugs[index % itemSlugs.length]}.png`,
  layout: 'FOREGROUND',
  isAnimated: false,
  isActive: true,
  purchasable: true,
}))

export const friends = Array.from({ length: 20 }, (_, i) => i + 1).map(index => ({
  userId: `friend-${index}`,
  nickname: `가나다라마바사아자차카타파하친구${index}`,
  likeCount: index,
  liked: false,
}))

const activeGrowth = {
  speciesCode: 'cat',
  kind: 'SPIRIT',
  nameKo: '고양이 정령',
  currentStage: 3,
  stageLabel: '고양이 정령 2단계',
  effectiveProgress: 20,
  stampCount: 20,
  goal: 30,
  dormant: false,
  cycleId: 'cat:layout',
  cycleState: 'ACTIVE',
  stages: [
    { stage: 1, threshold: 1, label: '수수께끼 정령' },
    { stage: 2, threshold: 10, label: '고양이 정령 1단계' },
    { stage: 3, threshold: 20, label: '고양이 정령 2단계' },
  ],
  lostAt: null,
  completedAt: null,
  reviveRubyCost: 10,
  reviveSnoozedUntil: null,
  completedToday: false,
  notifyNext: false,
}

const terrarium = {
  terrariumId: 1,
  background: { id: 1, name: '기본 배경', assetUrl: '' },
  placedItems: [],
  maxSlots: 10,
  tier: 'GLASS_JAR',
  activeTier: 'GLASS_JAR',
  highestUnlockedTier: 'GLASS_JAR',
  wilting: { stage: 0, daysSinceRecord: 0 },
  freePlacements: [],
}

const tiers = ['GLASS_JAR', 'LARGE_JAR', 'GRAND_TANK'].map((tier, index) => ({
  tier,
  tierOrder: index + 1,
  level: index + 1,
  nameKo: `Lv.${index + 1}`,
  descriptionKo: '레이아웃 픽스처',
  sparkleCost: 0,
  rubyCost: index * 30,
  slots: (index + 1) * 10,
  spiritCode: null,
  unlocked: index === 0,
  active: index === 0,
  previewAssetUrl: null,
}))

const attendance = {
  today: false,
  streak: 0,
  longestStreak: 0,
  rewardBasicCoins: 10,
  bonusEligible: false,
  serverDateKst: '2026-09-02',
  cycleStartDateKst: null,
  cycleDay: 1,
  board: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, rewardBasicCoins: day * 10, claimed: false, claimedAt: null })),
  cycleBonusRuby: 5,
  cycleBonusClaimed: false,
}

const categories = ['산책', '독서', '러닝', '낙서'].map((name, index) => ({
  id: index + 1,
  name,
  iconUrl: null,
  color: '#A1CCDB',
  tokenName: ['이슬', '햇살', '번개', '바람'][index],
  emoji: ['🚶', '📚', '🏃', '✏️'][index],
  baseCoinReward: 10,
  baseTokenReward: 1,
  dailyLimit: 10,
  isCustom: false,
  ownerUserId: null,
}))

const placements = Array.from({ length: 40 }, (_, i) => {
  const item = items[i % items.length]!
  const x = 0.3 + (i % 5) * 0.09
  const y = 0.4 + Math.floor(i / 5) * 0.055
  return {
    id: i + 1, placementId: i + 1, itemId: item.id, itemImage: item.assetUrl,
    slug: item.slug, name: item.name, itemName: item.name,
    posX: x, posY: y, x, y, rotation: 0, scale: 0.35, zIndex: i, slotId: i,
    isAnimated: false, isFreePlacement: true,
  }
})
const records = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, categoryId: 1, categoryName: '산책', type: 'DIARY', recordType: 'DIARY',
  memo: '밀집 기록 메모 '.repeat(6), createdAt: '2026-08-15T03:00:00Z',
  recordedAt: '2026-08-15T03:00:00Z', activityDate: '2026-08-15', recordedDate: '2026-08-15', duration: 30,
}))

// 외부 요청은 차단하고 모든 인증·업무 API는 브라우저 안에서 응답한다.
export async function installDenseData(context: BrowserContext, options: {
  baseURL: string
  scheme: 'light' | 'dark'
  signedOut?: boolean
  onboarding?: boolean
}) {
  const origin = new URL(options.baseURL).origin
  if (origin !== 'http://localhost:3000') throw new Error('픽스처 서버는 http://localhost:3000만 허용합니다')
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== origin) return route.abort('blockedbyclient')
    // 미등록 API가 로컬 프록시를 거쳐 실백엔드에 전달되는 것도 차단한다.
    if (new URL(route.request().url()).pathname.startsWith('/api/')) {
      return route.fulfill({ status: 501, json: { message: '등록되지 않은 픽스처 API' } })
    }
    return route.continue()
  })
  await context.addCookies([{
    name: 'tw.session_token', value: 'layout-fixture-session', domain: 'localhost',
    path: '/', httpOnly: true, sameSite: 'Lax',
  }])
  await context.addInitScript(({ scheme, onboarding }) => {
    // 앱 상태 초기화는 최상위 문서에만 필요하다. 404의 격리 프레임에서 저장소를 읽어 pageerror를 만들지 않는다.
    if (window.top !== window) return
    performance.setResourceTimingBufferSize(5000)
    localStorage.setItem('nuxt-color-mode', scheme)
    if (onboarding) localStorage.removeItem('tw-onboarding-done')
    else localStorage.setItem('tw-onboarding-done', 'true')
    localStorage.setItem('tw-home-friends-open', '1')
    localStorage.setItem('tw-home-wallet-open', '1')
  }, { scheme: options.scheme, onboarding: !!options.onboarding })
  await context.route('**/api/auth/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    const body = options.signedOut ? null : pathname.endsWith('/token')
      ? { token: 'layout-fixture-jwt' }
      : {
          session: { id: 'layout-session', userId: user.userId, expiresAt: '2099-01-01T00:00:00.000Z' },
          user: { id: user.userId, email: user.email, name: user.nickname },
        }
    return route.fulfill({ status: 200, json: body })
  })
  await context.route('**/notices.json', route => route.fulfill({ status: 200, json:
    Array.from({ length: 3 }, (_, i) => ({ id: i + 1, title: '긴 공지 제목 '.repeat(10),
      body: 'https://example.invalid/' + 'longurl'.repeat(30), date: '2026-08-10' })),
  }))
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    const corsHeaders = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,x-tw-retried',
    }
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }
    let body: unknown = {}
    if (pathname === '/users/me') body = { ...user, ownedItems: items.map(item => item.slug) }
    else if (pathname === '/items') body = { items }
    else if (pathname === '/terrarium/free-placement') body = { items: placements }
    else if (pathname === '/terrarium/tiers') {
      body = { currentTier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', tiers }
    }
    else if (pathname === '/terrarium') {
      body = { ...terrarium, maxSlots: 40, placedItems: placements, background: { id: 1, name: '데이터 밀집 배경', assetUrl: '' } }
    }
    else if (pathname === '/social/friends') body = friends
    else if (pathname === '/growth') body = { items: [activeGrowth] }
    else if (pathname === '/records/statistics') {
      body = { todayRecords: 1, thisWeekRecords: 4, totalRecords: 12, byCategory: [] }
    }
    else if (pathname === '/records') body = { content: records, page: 0, size: 100, totalElements: records.length, totalPages: 1 }
    else if (pathname === '/categories') body = { categories }
    else if (pathname === '/habits') {
      body = {
        trackers: [0, 1].map(n => ({
          id: n + 1,
          title: n ? '완료된 습관 트래커 긴 이름' : '진행 중인 습관 트래커 긴 이름',
          currentStreakDays: n ? 7 : 2,
          cycleLengthDays: 7,
          completedCycles: 0,
          status: n ? 'COMPLETED' : 'ACTIVE',
          lastCheckedDate: '2026-09-01',
          friendLinked: false,
          friendUserId: null,
          friendNickname: null,
          partnerActive: null,
          partnerStatus: 'NONE',
          partnerCheckedToday: false,
          checkedDays: n ? [1, 2, 3, 4, 5, 6, 7] : [1, 2],
        })),
      }
    }
    else if (pathname === '/rewards/attendance') body = attendance
    else if (pathname === '/notifications/unread-count') body = { count: 30 }
    else if (pathname === '/notifications') {
      body = {
        content: Array.from({ length: 30 }, (_, i) => ({
          id: i, title: '아주 긴 알림 제목 '.repeat(10) + i, body: '알림 본문 '.repeat(10),
          createdAt: '2026-08-15T00:00:00Z', read: false,
        })),
        totalPages: 1, totalElements: 30,
      }
    }
    else if (pathname === '/exchange/rates') body = { rates: [] }

    else if (pathname.startsWith('/share/')) body = { nickname: user.nickname, terrarium: { ...terrarium, placedItems: placements } }
    else if (pathname === '/invites') {
      // index.vue의 onInviteShare가 읽는 실제 InviteResponse 필드명으로 발급 성공 상태를 재현한다.
      body = {
        inviteCode: 'TESTCODE1', inviteLink: 'http://localhost:3000/share/TESTCODE1',
        expiresAt: '2099-01-01T00:00:00Z', inviterRuby: 30, inviteeRuby: 10,
      } satisfies InviteResponse
    }
    else if (pathname === '/rankings/monthly') {
      body = { yearMonth: '2026-08', myRank: 1, myScore: 9999999, entries: friends.map((friend, i) => ({
        ...friend, rank: i + 1, score: 9999999, isSelf: i === 0,
      })) }
    }
    else if (pathname.startsWith('/notes/')) body = { note: '긴 일기 메모 '.repeat(10) }
    else if (pathname === '/todo-routines') body = { routines: [] }
    await route.fulfill({ status: 200, headers: corsHeaders, json: body })
  })
}
