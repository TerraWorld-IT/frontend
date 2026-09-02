import { expect, test, type Browser, type Page, type ViewportSize } from '@playwright/test'

const currency = {
  balances: ['COIN', 'RUBY', 'SPARKLE', 'DEW', 'SUN', 'BOLT', 'WIND']
    .map((code, index) => ({ code, amount: 1000 - index * 100 })),
}

const user = {
  userId: 'layout-user',
  email: 'layout@example.com',
  nickname: '레이아웃 유저',
  role: 'USER',
  currency,
  ownedItems: [],
  placedItems: [],
  entitlements: { freePlacement: false, premiumThemes: false },
}

const itemSlugs = ['dischidia', 'humata-fern', 'nandina', 'pilea-peperomioides', 'pteris', 'scindapsus']
const items = itemSlugs.map((slug, index) => ({
  id: index + 1,
  slug,
  name: `테스트 식물 ${index + 1}`,
  description: '레이아웃 픽스처',
  categoryId: 1,
  categoryName: '식물',
  priceType: 'BASIC',
  priceAmount: 100 + index * 10,
  tokenPrice: null,
  rarity: 'COMMON',
  assetUrl: `/items/${slug}.png`,
  layout: 'FOREGROUND',
  isAnimated: false,
  isActive: true,
  purchasable: true,
}))

const friends = [1, 2, 3].map(index => ({
  userId: `friend-${index}`,
  nickname: `친구 ${index}`,
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

async function openFixturePage(
  browser: Browser,
  path: string,
  viewport: ViewportSize = { width: 430, height: 900 },
  options: { growthItems?: Array<Record<string, unknown>>, delayMs?: number, clockTime?: string } = {},
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Seoul',
  })
  await context.addCookies([{
    name: 'tw.session_token',
    value: 'layout-fixture-session',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }])
  await context.addInitScript(() => {
    localStorage.setItem('tw-onboarding-done', 'true')
    localStorage.setItem('tw-home-friends-open', '1')
    localStorage.setItem('tw-home-wallet-open', '1')
  })

  const seenPaths = new Set<string>()
  let releaseGate!: () => void
  const responseGate = new Promise<void>((resolve) => { releaseGate = resolve })
  let responsesReleased = false
  const releaseResponses = () => {
    if (responsesReleased) return
    responsesReleased = true
    releaseGate()
  }
  await context.route('**/api/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/token')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'layout-fixture-jwt' }) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { id: 'layout-session', userId: user.userId, expiresAt: '2099-01-01T00:00:00.000Z' },
        user: { id: user.userId, email: user.email, name: user.nickname },
      }),
    })
  })
  await context.route('**/notices.json', async (route) => {
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, options.delayMs ?? 800)),
      responseGate,
    ])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, title: '정령이 추가 되었어요', body: '도마뱀정령이 추가 되었어요', date: '2026-08-10' }]),
    })
  })
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    const corsHeaders = {
      'access-control-allow-origin': 'http://localhost:3000',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,x-tw-retried',
    }
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    seenPaths.add(pathname)
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, options.delayMs ?? 800)),
      responseGate,
    ])

    let body: unknown = {}
    if (pathname === '/users/me') body = user
    else if (pathname === '/items') body = { items }
    else if (pathname === '/terrarium/free-placement') body = { items: [] }
    else if (pathname === '/terrarium/tiers') {
      body = { currentTier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', tiers }
    }
    else if (pathname === '/terrarium') body = terrarium
    else if (pathname === '/social/friends') body = friends
    else if (pathname === '/growth') body = { items: options.growthItems ?? [activeGrowth] }
    else if (pathname === '/records/statistics') {
      body = { todayRecords: 1, thisWeekRecords: 4, totalRecords: 12, byCategory: [] }
    }
    else if (pathname === '/records') body = { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 }
    else if (pathname === '/categories') body = { categories }
    else if (pathname === '/habits') {
      body = {
        trackers: [{
          id: 1,
          title: '매일 물 마시기',
          currentStreakDays: 2,
          cycleLengthDays: 7,
          completedCycles: 0,
          status: 'ACTIVE',
          lastCheckedDate: '2026-09-01',
          friendLinked: false,
          friendUserId: null,
          friendNickname: null,
          partnerActive: null,
          partnerStatus: 'NONE',
          partnerCheckedToday: false,
          checkedDays: [1, 2],
        }],
      }
    }
    else if (pathname === '/rewards/attendance') body = attendance
    else if (pathname === '/notifications/unread-count') body = { count: 0 }

    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  })

  const page = await context.newPage()
  if (options.clockTime) await page.clock.install({ time: new Date(options.clockTime) })
  const requestedUrls: string[] = []
  const pageErrors: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') requestedUrls.push(request.url())
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  return { context, page, seenPaths, requestedUrls, pageErrors, releaseResponses }
}

async function box(page: Page, selector: string) {
  const value = await page.locator(selector).first().boundingBox()
  expect(value, `${selector} bounding box`).not.toBeNull()
  return value!
}

test.describe('layout parity with API-only fixtures', () => {
  test('page skeletons reserve representative loaded geometry', async ({ browser }) => {
    test.setTimeout(60_000)

    const cases = [
      {
        name: 'home-320',
        path: '/',
        viewport: { width: 320, height: 640 },
        skeleton: '[data-testid="home-layout-skeleton"]',
        anchors: ['home-menu', 'home-title', 'home-stage', 'home-mode', 'home-friends', 'home-wallet'],
      },
      {
        name: 'home-360',
        path: '/',
        viewport: { width: 360, height: 780 },
        skeleton: '[data-testid="home-layout-skeleton"]',
        anchors: ['home-menu', 'home-title', 'home-stage', 'home-mode', 'home-friends', 'home-wallet'],
      },
      {
        name: 'home-430',
        path: '/',
        viewport: { width: 430, height: 900 },
        skeleton: '[data-testid="home-layout-skeleton"]',
        anchors: ['home-menu', 'home-title', 'home-stage', 'home-mode', 'home-friends', 'home-wallet'],
      },
      {
        name: 'grow',
        path: '/grow',
        skeleton: '[data-testid="grow-content-skeleton"]',
        anchors: ['grow-stamp-board', 'grow-action-card'],
      },
      {
        name: 'calendar-5-week',
        path: '/calendar',
        skeleton: '[data-testid="calendar-layout-skeleton"]',
        anchors: ['calendar-header', 'calendar-stats', 'calendar-grid'],
        clockTime: '2026-09-15T12:00:00+09:00',
        calendarWeeks: 5,
      },
      {
        name: 'calendar-6-week',
        path: '/calendar',
        skeleton: '[data-testid="calendar-layout-skeleton"]',
        anchors: ['calendar-header', 'calendar-stats', 'calendar-grid'],
        clockTime: '2026-08-15T12:00:00+09:00',
        calendarWeeks: 6,
      },
      {
        name: 'profile',
        path: '/profile',
        skeleton: '[data-testid="profile-layout-skeleton"]',
        anchors: ['profile-header', 'profile-user-card', 'profile-friends-card', 'profile-currency-card', 'profile-account-card'],
      },
      {
        name: 'shop',
        path: '/shop',
        skeleton: '[data-testid="shop-layout-skeleton"]',
        anchors: ['shop-grid'],
      },
      {
        name: 'record',
        path: '/record',
        skeleton: '[data-testid="record-habit-skeleton"]',
        anchors: ['record-habit-card', 'record-daily-section'],
      },
    ]
    const measurements: Array<Record<string, unknown>> = []
    const fixturePaths: Record<string, string[]> = {}

    for (const entry of cases) {
      const clockTime = 'clockTime' in entry ? entry.clockTime : undefined
      const calendarWeeks = 'calendarWeeks' in entry ? entry.calendarWeeks : undefined
      const viewport = 'viewport' in entry ? entry.viewport : { width: 430, height: 900 }
      const isHome = entry.path === '/'
      const { context, page, seenPaths, requestedUrls, pageErrors, releaseResponses } = await openFixturePage(
        browser,
        entry.path,
        viewport,
        { clockTime },
      )
      await expect(page.locator(entry.skeleton)).toBeVisible()
      expect(
        pageErrors,
        `${entry.name} browser errors; seen=${JSON.stringify([...seenPaths])}; requests=${JSON.stringify(requestedUrls)}`,
      ).toEqual([])
      expect(await page.locator(entry.skeleton).count(), `${entry.name} requests: ${JSON.stringify(requestedUrls)}`).toBe(1)
      if (calendarWeeks) {
        // production SSR 은 서버 시계를 쓰고 page.clock 은 hydration 된 브라우저만 제어한다.
        // 5주짜리 SSR 박스가 6주 hydration 그리드와 비교되지 않도록, 클라이언트 시계 기준 월이
        // 반영된 뒤에만 geometry 를 저장한다.
        await expect(page.locator('[data-testid="calendar-skeleton-cell"]')).toHaveCount(calendarWeeks * 7)
      }
      const before = await Promise.all(entry.anchors.map(anchor => box(page, `[data-layout-anchor="${anchor}"]`)))
      const reservedHeight = before.at(-1)!.y + before.at(-1)!.height - before[0]!.y
      const shopSkeletonCard = entry.name === 'shop' ? await box(page, '[data-testid="shop-skeleton-card"]') : null
      const homeStageSkeleton = isHome
        ? {
            container: await box(page, '[data-testid="home-stage-container-skeleton"]'),
            track: await box(page, '[data-testid="home-stage-track-skeleton"]'),
          }
        : null

      releaseResponses()
      await expect(page.locator(entry.skeleton)).toBeHidden({ timeout: 10_000 })
      expect(
        await page.getByText(/불러오기 실패|불러오지 못했어요/).count(),
        `${entry.name} fixture paths: ${JSON.stringify([...seenPaths])}`,
      ).toBe(0)
      if (isHome) await expect(page.locator('[data-testid^="home-visit-"]')).toHaveCount(3)
      if (entry.name === 'profile') await expect(page.locator('[data-testid="profile-friend-skeleton-row"]').first()).toBeVisible()
      const profileFriendSkeleton = entry.name === 'profile'
        ? await box(page, '[data-testid="profile-friend-skeleton-row"]')
        : null
      if (entry.name === 'profile') await expect(page.locator('[data-testid="profile-friend-row"]')).toHaveCount(3)
      if (entry.name === 'shop') await expect(page.locator('[data-testid="shop-item-card"]')).toHaveCount(6)

      const after = await Promise.all(entry.anchors.map(anchor => box(page, `[data-layout-anchor="${anchor}"]`)))
      const loadedHeight = after.at(-1)!.y + after.at(-1)!.height - after[0]!.y
      entry.anchors.forEach((anchor, index) => {
        const movement = Math.abs(after[index]!.y - before[index]!.y)
        const heightDelta = after[index]!.height - before[index]!.height
        measurements.push({
          page: entry.name,
          anchor,
          skeletonY: before[index]!.y,
          loadedY: after[index]!.y,
          skeletonHeight: before[index]!.height,
          loadedHeight: after[index]!.height,
          heightDelta,
          movement,
        })
        expect(
          movement,
          `${entry.name}:${anchor} movement (skeleton=${before[index]!.y}, loaded=${after[index]!.y}, delta=${movement}); skeleton geometry=${JSON.stringify(before)}; loaded geometry=${JSON.stringify(after)}`,
        ).toBeLessThanOrEqual(8)
        expect(
          Math.abs(heightDelta),
          `${entry.name}:${anchor} height parity (skeleton=${before[index]!.height}, loaded=${after[index]!.height}, delta=${heightDelta})`,
        ).toBeLessThanOrEqual(8)
      })
      const representativeHeightDelta = loadedHeight - reservedHeight
      measurements.push({ page: entry.name, region: 'representative', reservedHeight, loadedHeight, heightDelta: representativeHeightDelta })
      expect(
        Math.abs(representativeHeightDelta),
        `${entry.name} representative height (reserved=${reservedHeight}, loaded=${loadedHeight}, delta=${representativeHeightDelta})`,
      ).toBeLessThanOrEqual(8)

      if (isHome) {
        const loadedContainer = await box(page, '#my-terra-container')
        const loadedTrack = await box(page, '[data-testid="jar-carousel"]')
        const expectedTrackHeight = Math.max(380, 40 + Math.min(300, loadedTrack.width * 0.88) * 380 / 300)
        measurements.push({
          page: entry.name,
          region: 'stage-container',
          reservedHeight: homeStageSkeleton!.container.height,
          loadedHeight: loadedContainer.height,
          heightDelta: loadedContainer.height - homeStageSkeleton!.container.height,
        })
        measurements.push({
          page: entry.name,
          region: 'carousel-track',
          trackWidth: loadedTrack.width,
          expectedTrackHeight,
          reservedHeight: homeStageSkeleton!.track.height,
          loadedHeight: loadedTrack.height,
          heightDelta: loadedTrack.height - homeStageSkeleton!.track.height,
        })
        expect(Math.abs(homeStageSkeleton!.container.height - 380)).toBeLessThanOrEqual(1)
        expect(Math.abs(loadedContainer.height - 380)).toBeLessThanOrEqual(1)
        expect(Math.abs(homeStageSkeleton!.track.height - loadedTrack.height)).toBeLessThanOrEqual(1)
        expect(Math.abs(homeStageSkeleton!.track.height - expectedTrackHeight)).toBeLessThanOrEqual(1)
        expect(Math.abs(loadedTrack.height - expectedTrackHeight)).toBeLessThanOrEqual(1)
      }

      if (calendarWeeks) {
        const loadedCellCount = await page.locator('[data-testid="calendar-days-grid"] > *').count()
        expect(Math.ceil(loadedCellCount / 7)).toBe(calendarWeeks)
      }

      if (entry.name === 'shop') {
        const loadedCard = await box(page, '[data-testid="shop-item-card"]')
        measurements.push({ page: 'shop', region: 'card-row', reservedHeight: shopSkeletonCard!.height, loadedHeight: loadedCard.height, heightDelta: loadedCard.height - shopSkeletonCard!.height })
        expect(Math.abs(loadedCard.height - shopSkeletonCard!.height)).toBeLessThanOrEqual(1)
      }

      if (entry.name === 'profile') {
        const loadedFriend = await box(page, '[data-testid="profile-friend-row"]')
        measurements.push({ page: 'profile/friends', region: 'friend-row', reservedHeight: profileFriendSkeleton!.height, loadedHeight: loadedFriend.height, heightDelta: loadedFriend.height - profileFriendSkeleton!.height })
        expect(Math.abs(loadedFriend.height - profileFriendSkeleton!.height)).toBeLessThanOrEqual(1)

        await page.getByRole('button', { name: '공지사항' }).click()
        await expect(page.locator('[role="dialog"] [aria-busy="true"]')).toBeVisible()
        const dialogBefore = await box(page, '[role="dialog"] > div')
        const noticeSkeleton = await box(page, '[data-testid="notice-skeleton-row"]')
        await expect(page.locator('[role="dialog"] li')).toHaveCount(1)
        const dialogAfter = await box(page, '[role="dialog"] > div')
        const noticeLoaded = await box(page, '[data-testid="notice-row"]')
        measurements.push({
          page: 'profile/notices',
          region: 'notice-row',
          reservedHeight: noticeSkeleton.height,
          loadedHeight: noticeLoaded.height,
          heightDelta: noticeLoaded.height - noticeSkeleton.height,
          dialogMovement: Math.abs(dialogAfter.y - dialogBefore.y),
        })
        expect(Math.abs(noticeLoaded.height - noticeSkeleton.height)).toBeLessThanOrEqual(1)
        expect(Math.abs(dialogAfter.y - dialogBefore.y)).toBeLessThanOrEqual(8)
      }

      expect(
        pageErrors,
        `${entry.name} post-load browser errors; seen=${JSON.stringify([...seenPaths])}; requests=${JSON.stringify(requestedUrls)}`,
      ).toEqual([])
      fixturePaths[entry.name] = [...seenPaths].sort()
      await context.close()
    }

    // eslint-disable-next-line no-console
    console.log(`LAYOUT_PARITY_METRICS=${JSON.stringify({ measurements, fixturePaths })}`)
  })

  test('grow uses width-locked hero/background across viewports and states', async ({ browser }, testInfo) => {
    test.setTimeout(90_000)

    const viewports = [
      { width: 320, height: 640, safeTopPx: 47 },
      { width: 430, height: 700, safeTopPx: 0 },
      { width: 430, height: 900, safeTopPx: 0 },
      { width: 448, height: 1064, safeTopPx: 0 },
    ]
    const geometryRatios: Record<string, Array<{ viewport: string, centerYOverWidth: number, widthOverWidth: number }>> = {
      header: [],
      chip: [],
      spirit: [],
      label: [],
    }
    const overlapGaps: Record<string, number> = {}
    const safeAreaOrigins: Record<string, { safeTopPx: number, backgroundOriginY: number, canvasOriginY: number, originDelta: number }> = {}
    const screenshots: string[] = []

    for (const viewport of viewports) {
      const { context, page, seenPaths, pageErrors, releaseResponses } = await openFixturePage(browser, '/grow', viewport)
      if (viewport.safeTopPx > 0) {
        await page.addStyleTag({
          content: `:root { --sat: ${viewport.safeTopPx}px; } main { padding-top: calc(1rem + var(--sat)) !important; }`,
        })
      }
      const pendingHero = await box(page, '[data-testid="grow-hero"]')
      releaseResponses()
      await expect(page.locator('[data-testid="grow-content-skeleton"]')).toBeHidden({ timeout: 10_000 })
      expect(await page.getByText('정보를 불러오지 못했어요').count(), `grow fixture paths: ${JSON.stringify([...seenPaths])}`).toBe(0)
      const hero = await box(page, '[data-testid="grow-hero"]')
      const canvas = await box(page, '[data-testid="grow-hero-canvas"]')
      const growPage = await box(page, '[data-testid="grow-page"]')
      const headerStack = await box(page, '[data-testid="grow-hero-header-stack"]')
      const elements = {
        header: await box(page, '[data-testid="grow-hero-header"]'),
        chip: await box(page, '[data-testid="grow-hero-sparkle-chip"]'),
        spirit: await box(page, '[data-testid="grow-spirit-anchor"]'),
        label: await box(page, '[data-testid="grow-stage-label"]'),
      }
      const viewportKey = `${viewport.width}x${viewport.height}`
      for (const [name, element] of Object.entries(elements)) {
        geometryRatios[name]!.push({
          viewport: viewportKey,
          centerYOverWidth: (element.y + element.height / 2 - canvas.y) / canvas.width,
          widthOverWidth: element.width / canvas.width,
        })
      }
      const backgroundOffsetY = await page.locator('[data-testid="grow-page"]').evaluate((el) => {
        return Number.parseFloat(getComputedStyle(el).backgroundPositionY)
      })
      const backgroundOriginY = growPage.y + backgroundOffsetY
      const canvasOriginY = canvas.y
      const originDelta = canvasOriginY - backgroundOriginY
      safeAreaOrigins[viewportKey] = { safeTopPx: viewport.safeTopPx, backgroundOriginY, canvasOriginY, originDelta }
      expect(Number.isFinite(backgroundOffsetY), `${viewportKey} background-position-y`).toBe(true)
      expect(Math.abs(backgroundOffsetY - viewport.safeTopPx), `${viewportKey} background safe-area offset`).toBeLessThanOrEqual(0.5)
      expect(Math.abs(originDelta), `${viewportKey} bitmap/canvas origin delta`).toBeLessThanOrEqual(0.5)
      const overlapGap = elements.spirit.y - (headerStack.y + headerStack.height)
      overlapGaps[viewportKey] = overlapGap
      if (viewport.width === 320) {
        expect(overlapGap, `320px header/chip bottom=${headerStack.y + headerStack.height}, spirit top=${elements.spirit.y}`).toBeGreaterThanOrEqual(8)
      }
      expect(Math.abs(hero.height - pendingHero.height)).toBeLessThanOrEqual(0.5)
      expect(await page.locator('[data-testid="grow-page"]').evaluate(el => getComputedStyle(el).backgroundSize)).toMatch(/^100%(?: auto)?$/)

      const screenshotPath = testInfo.outputPath(`grow-${viewport.width}x${viewport.height}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      await testInfo.attach(`grow-${viewport.width}x${viewport.height}`, { path: screenshotPath, contentType: 'image/png' })
      screenshots.push(screenshotPath)
      expect(pageErrors, `${viewportKey} post-load browser errors; seen=${JSON.stringify([...seenPaths])}`).toEqual([])
      await context.close()
    }

    const ratioSpreads: Record<string, Record<string, number>> = {}
    for (const [name, measurements] of Object.entries(geometryRatios)) {
      ratioSpreads[name] = {}
      for (const key of ['centerYOverWidth', 'widthOverWidth'] as const) {
        const values = measurements.map(measurement => measurement[key])
        const spread = (Math.max(...values) - Math.min(...values)) / Math.max(Math.abs(Math.min(...values)), Number.EPSILON)
        ratioSpreads[name]![key] = spread
        expect(spread, `${name} ${key} ratios: ${JSON.stringify(values)}`).toBeLessThanOrEqual(0.02)
      }
    }

    const variants: Array<{ name: string, growthItems: Array<Record<string, unknown>> }> = [
      { name: 'empty', growthItems: [] },
      { name: 'active-one', growthItems: [activeGrowth] },
      { name: 'active-two', growthItems: [activeGrowth, { ...activeGrowth, speciesCode: 'tomato-vine', nameKo: '토마토 덩굴', cycleId: 'tomato-vine:layout' }] },
      { name: 'completed', growthItems: [{ ...activeGrowth, stampCount: 30, effectiveProgress: 30, cycleState: 'COMPLETED', completedAt: '2026-09-02T00:00:00Z' }] },
      // 두 번째 개체만 완료된 조합 — 히어로는 첫 개체를 그리고, 완료 카드는 두 번째 정령을 한 번 그려야 한다.
      { name: 'completed-two', growthItems: [activeGrowth, { ...activeGrowth, speciesCode: 'tomato-vine', nameKo: '토마토 덩굴', cycleId: 'tomato-vine:layout', stampCount: 30, effectiveProgress: 30, cycleState: 'COMPLETED', completedAt: '2026-09-02T00:00:00Z' }] },
      { name: 'lost', growthItems: [{ ...activeGrowth, dormant: true, cycleState: 'LOST', lostAt: '2026-09-01T00:00:00Z', reviveSnoozedUntil: '2099-01-01' }] },
    ]
    const heroHeights: Record<string, number> = {}
    let completedSpiritVisualCount: number | null = null
    for (const variant of variants) {
      const { context, page, pageErrors, releaseResponses } = await openFixturePage(browser, '/grow', { width: 430, height: 900 }, { growthItems: variant.growthItems })
      releaseResponses()
      await expect(page.locator('[data-testid="grow-content-skeleton"]')).toBeHidden({ timeout: 10_000 })
      heroHeights[variant.name] = (await box(page, '[data-testid="grow-hero"]')).height
      expect(await page.locator('[data-testid="grow-page"]').evaluate(el => getComputedStyle(el).backgroundSize)).toMatch(/^100%(?: auto)?$/)
      if (variant.name === 'completed') {
        const spiritVisuals = page.locator('img[alt="고양이 정령"]')
        await expect(spiritVisuals).toHaveCount(1)
        completedSpiritVisualCount = await spiritVisuals.count()
        await expect(page.getByRole('button', { name: '관리 모드 바로가기' })).toBeVisible()
      }
      if (variant.name === 'completed-two') {
        // 히어로는 첫 개체(고양이 정령 img) 하나, 완료 카드는 두 번째 개체(tomato-vine 인라인 SVG, animate-sway) 하나.
        await expect(page.locator('img[alt="고양이 정령"]')).toHaveCount(1)
        const completedCard = page.locator('.apjek-card', { hasText: '키우기 성공!' })
        await expect(completedCard).toHaveCount(1)
        await expect(completedCard.locator('svg[width="164"]')).toHaveCount(1)
      }
      expect(pageErrors, `${variant.name} post-load browser errors`).toEqual([])
      await context.close()
    }
    expect(Math.max(...Object.values(heroHeights)) - Math.min(...Object.values(heroHeights))).toBeLessThanOrEqual(0.5)

    // eslint-disable-next-line no-console
    console.log(`GROW_PARITY_METRICS=${JSON.stringify({ ratioOrigin: 'grow-hero-canvas', viewports, geometryRatios, ratioSpreads, overlapGaps, safeAreaOrigins, heroHeights, completedSpiritVisualCount, screenshots })}`)
  })
})
