import { chromium, type Browser } from '@playwright/test'
import assert from 'node:assert/strict'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3143'
const currency = { balances: ['COIN', 'RUBY', 'SPARKLE', 'DEW', 'SUN', 'BOLT', 'WIND'].map(code => ({ code, amount: 1000 })) }
const user = {
  userId: 'gesture-user', email: 'gesture@example.test', nickname: '터치 검증', role: 'USER', currency,
  ownedItems: [], placedItems: [], entitlements: { freePlacement: false, premiumThemes: false },
}
const tiers = ['GLASS_JAR', 'LARGE_JAR', 'GRAND_TANK'].map((tier, index) => ({
  tier, tierOrder: index + 1, level: index + 1, nameKo: `Lv.${index + 1}`, descriptionKo: '터치 검증',
  sparkleCost: 0, rubyCost: index * 30, slots: (index + 1) * 10, spiritCode: null,
  unlocked: index === 0, active: index === 0, previewAssetUrl: null,
}))
const responses: Record<string, unknown> = {
  '/users/me': user,
  '/items': { items: [] },
  '/terrarium/free-placement': { items: [] },
  '/terrarium/tiers': { currentTier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR', tiers },
  '/terrarium': {
    terrariumId: 1, background: { id: 1, name: '기본 배경', assetUrl: '' }, placedItems: [], maxSlots: 10,
    tier: 'GLASS_JAR', activeTier: 'GLASS_JAR', highestUnlockedTier: 'GLASS_JAR',
    wilting: { stage: 0, daysSinceRecord: 0 }, freePlacements: [],
  },
  '/terrarium/heart': { updatedBasicCoins: 1001 },
  '/social/friends': [1, 2, 3].map(index => ({ userId: `friend-${index}`, nickname: `친구 ${index}`, likeCount: 0, liked: false })),
  '/growth': { items: [] },
  '/rewards/attendance': {
    today: false, streak: 0, longestStreak: 0, rewardBasicCoins: 10, bonusEligible: false,
    serverDateKst: '2026-09-09', cycleStartDateKst: null, cycleDay: 1,
    board: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, rewardBasicCoins: 10, claimed: false, claimedAt: null })),
    cycleBonusRuby: 5, cycleBonusClaimed: false,
  },
  '/notifications/unread-count': { count: 0 },
}

async function openHome(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 430, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Seoul' })
  await context.addCookies([{ name: 'tw.session_token', value: 'gesture-fixture', domain: new URL(baseURL).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }])
  await context.addInitScript(() => {
    localStorage.setItem('tw-onboarding-done', 'true')
    localStorage.setItem('tw-home-friends-open', '1')
    localStorage.setItem('tw-home-wallet-open', '1')
  })
  await context.route('**/api/auth/**', async (route) => {
    const body = new URL(route.request().url()).pathname.endsWith('/token')
      ? { token: 'gesture-fixture-jwt' }
      : { session: { id: 'gesture-session', userId: user.userId, expiresAt: '2099-01-01T00:00:00.000Z' }, user: { id: user.userId, email: user.email, name: user.nickname } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await context.route('**/notices.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    await route.fulfill({
      status: request.method() === 'OPTIONS' ? 204 : 200,
      headers: {
        'access-control-allow-origin': baseURL, 'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,x-tw-retried',
        'content-type': 'application/json',
      },
      body: request.method() === 'OPTIONS' ? '' : JSON.stringify(responses[pathname] ?? {}),
    })
  })
  const page = await context.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()) })
  page.on('requestfailed', request => pageErrors.push(request.url() + ': ' + request.failure()?.errorText))
  process.stdout.write('navigation start\n')
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  process.stdout.write('navigation done: ' + page.url() + '\n')
  return { context, page, pageErrors }
}

// 실제 페이지와 네이티브 터치 입력을 사용하고 API 응답만 로컬 픽스처로 대체한다.
const browser = await chromium.launch({ headless: true })
try {
  const { context, page, pageErrors } = await openHome(browser)
  const stage = page.locator('#my-terra-container')
  await stage.waitFor({ state: 'visible', timeout: 60000 }).catch(async (error) => {
    process.stdout.write(JSON.stringify({ url: page.url(), pageErrors, body: (await page.locator('body').innerText()).slice(0, 1200) }) + '\n')
    throw error
  })
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    const original = Element.prototype.setPointerCapture
    const captures: number[] = []
    Object.assign(window, { gestureCaptures: captures })
    Element.prototype.setPointerCapture = function (pointerId: number) {
      if (this.id === 'my-terra-container') captures.push(pointerId)
      return original.call(this, pointerId)
    }
  })
  const action = await stage.evaluate(el => getComputedStyle(el).touchAction)
  assert.equal(action, 'pan-x pan-y')
  process.stdout.write('stage ready\n')
  const heartRequest = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/terrarium/heart') && request.method() === 'POST')
  await page.getByTestId('home-heart').tap()
  await heartRequest
  process.stdout.write('heart done\n')
  const capturesAfterHeart = await page.evaluate(() => (window as any).gestureCaptures.length)
  assert.equal(capturesAfterHeart, 0)
  const cdp = await context.newCDPSession(page)
  async function swipe(x: number, y: number, dx: number, dy: number) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 12, y: y + dy * i / 12, id: 1 }] })
      await page.waitForTimeout(20)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)
  }
  const bounds = (await stage.boundingBox())!
  const beforeY = await page.evaluate(() => window.scrollY)
  await swipe(bounds.x + bounds.width / 2, Math.min(bounds.y + bounds.height * 0.7, 640), 0, -180)
  const afterY = await page.evaluate(() => window.scrollY)
  process.stdout.write(JSON.stringify({ beforeY, afterY }) + '\n')
  assert.ok(afterY > beforeY + 20, `vertical scroll ${beforeY} -> ${afterY}`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const track = page.getByTestId('jar-carousel')
  const beforeX = await track.evaluate(el => el.scrollLeft)
  const swipeBounds = (await stage.boundingBox())!
  await swipe(swipeBounds.x + swipeBounds.width * 0.75, swipeBounds.y + 100, -270, 0)
  const afterX = await track.evaluate(el => el.scrollLeft)
  process.stdout.write(JSON.stringify({ beforeX, afterX }) + '\n')
  assert.ok(afterX > beforeX + 100, `horizontal swipe ${beforeX} -> ${afterX}`)
  const capturesAfterSwipes = await page.evaluate(() => (window as any).gestureCaptures.length)
  assert.equal(capturesAfterSwipes, 0)
  await page.getByRole('button', { name: 'Lv.1 슬라이드', exact: true }).tap()
  await page.waitForTimeout(700)
  const pinchBounds = (await stage.boundingBox())!
  const y = pinchBounds.y + 100
  const scaleBefore = await stage.locator(':scope > div').first().evaluate(el => (el as HTMLElement).style.transform)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y, id: 10 }] })
  const firstCaptureCount = await page.evaluate(() => (window as any).gestureCaptures.length)
  assert.equal(firstCaptureCount, 0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y, id: 10 }, { x: 240, y, id: 11 }] })
  const twoCaptureCount = await page.evaluate(() => (window as any).gestureCaptures.length)
  assert.equal(twoCaptureCount, 2)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 130, y, id: 10 }, { x: 250, y, id: 11 }] })
  await page.waitForTimeout(300)
  const scaleAfter = await stage.locator(':scope > div').first().evaluate(el => (el as HTMLElement).style.transform)
  process.stdout.write(JSON.stringify({ scaleBefore, scaleAfter }) + '\n')
  assert.notEqual(scaleAfter, scaleBefore)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  process.stdout.write(JSON.stringify({ browser: browser.version(), viewport: '430x780', touchAction: action, heartPost: true, capturesAfterHeart, beforeY, afterY, beforeX, afterX, capturesAfterSwipes, firstCaptureCount, twoCaptureCount, scaleBefore, scaleAfter, pageErrors }, null, 2) + '\n')
  await context.close()
}
finally {
  await browser.close()
}
