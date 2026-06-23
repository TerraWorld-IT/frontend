# Code Review Report — 2026-06-23 Launch-Readiness Session

Scope: this session's working-tree changes across `backend` (Kotlin) + `frontend` (Nuxt/Vue) + `deploy` + `docs`. Generated openapi codegen excluded. Reviewers: security(opus) · quality(sonnet) · architecture(opus) · silent-failure-hunter(sonnet). **Codex: unavailable (`cli_unavailable`, fail-open).** Static review only — runtime/device behavior is the §7 human gate.

> Lint/type/build/test already verified green this session (BE 311 tests · FE typecheck EXIT 0 · vitest 93 · lint 0 errors). This review is **adversarial** (logic/security/convention), which is the dimension automated gates miss.

## Summary

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Security | 0 | 3 | 2 | 3 | 8 |
| Silent-failure | 0 | 1 | 3 | (4 verified-OK) | 4 |
| Quality | 0 | 2 | 4 | 9 | 15 |
| Architecture | 0 | 0 | 2 | 4 | 6 |
| **De-duped total** | **0** | **5** | **~8** | **~14** | **~27** |

**Session-introduced vs pre-existing**: ~6 findings are defects in code I wrote this session (marked ★); the rest are pre-existing surfaces this session touched or that the reviewers surfaced as launch-relevant.

---

## HIGH (fix before ship)

### ★ H1 — Consent checkbox diverges from persisted state on save failure (SESSION BUG, P3-2)
`frontend/app/pages/profile/index.vue:113-119,237-255` · security + silent-failure
The toggle is `:checked="item.value"` (uncontrolled) + `@change`, and `item.value = checked` is set **only after** `authClient.updateUser` succeeds. On failure the toast shows, but the **browser has already visually toggled the box** while `item.value` is unchanged and no reactive re-render snaps it back → user sees consent ON, server has it OFF. A consent UI showing an unpersisted state is a compliance-relevant lie. **Fix**: on `catch`, force re-sync to persisted value (`:key` bump or controlled binding off `item.value`). autoFixable.

### ★ H2 — AdSense is NOT consent-gated (only GA4 is) (SESSION GAP, P2-2b)
`frontend/app/components/common/AdSenseBanner.vue:42-59` + `nuxt.config.ts` CSP · security
P2-2b gated GA4 (`initMode:'manual'` + `analytics-consent.client.ts`), but `AdSenseBanner.vue` injects `adsbygoogle.js` + pushes an ad request on `onMounted` purely on `client && slot` — it never reads `adConsent`/`analyticsConsent`. AdSense sets advertising cookies/identifiers. The plugin comment claims "동의 전에는 네트워크 전송이 발생하지 않는다" — **false for ad tracking**. The profile page even exposes an "광고 식별자" toggle that nothing consumes on web. **Fix**: gate AdSense `enabled` on `adConsent` from session.

### ★ H3 — iOS ATT status discarded; error masks "prompt never shown" (SESSION, P3-3) — agents tagged CRITICAL
`frontend/app/composables/useAdMob.ts:33-46,77` + `capacitor.client.ts:47` · silent-failure
`requestTrackingAuthorization()` returns the ATT status but **every caller discards it**, and `catch { return null }` makes a plugin error indistinguishable from "denied". The app then `AdMob.initialize()`s unconditionally with no non-personalized branch. (Mitigation: the AdMob SDK auto-honors ATT for IDFA, so this is defense-in-depth + error-masking rather than confirmed tracking-on-denial → I rate **High**, not Critical.) **Fix**: capture status, treat `null`/non-`authorized` as fail-closed (non-personalized), surface errors to a GA-independent signal.

### H4 — AppStore `allow-sandbox-fallback` defaults `true` → sandbox receipt grants in prod (PRE-EXISTING, launch-gate)
`backend/.../billing/AppStorePurchaseVerifier.kt:46-47,91-101` · security
Default `true` means a `21007` (sandbox-on-prod) receipt is re-verified against sandbox and granted unless an operator sets `false`. Documented as needed for App Review, but the secure default is inverted. Still bounded (must be a valid Apple sandbox receipt for the right bundle/product/transaction + global-unique `tx_ref`), so not a free grant — but a launch decision. **Action**: flip to `false` post-review or gate by profile + emit audit on `prod + 21007 + fallback`.

### ★ H5 — OAuth signup × consent gate interaction (SESSION, latent, P1-3)
`server/lib/auth.ts:111-112` (`create.before` enforces `agreeTerms===true`) + `socialProviders` (env-gated, off by default)
Social-provider signups don't send `agreeTerms`/`agreePrivacy`, so the same `create.before` hook would **reject all OAuth signups** (broken) — or admit them un-consented if the hook is somehow skipped (legal gap). Currently inert (social login disabled). **Action**: collect consent in the OAuth callback before enabling `socialProviders`.

---

## MEDIUM

- **★ M1 — `useAttendance.ts`/`useCustomCategory.ts` still use `useI18n()`** (throws if called outside Vue setup) while `useEvolution`/`usePayment` use the setup-safe `useNuxtApp().$i18n`. Inconsistent (P4-3). Align to `$i18n`. (quality/arch)
- **★ M2 — `WalletBuilder` half-rename** (P4-1): class renamed but all 7 injection fields are still `private val currencyBuilder: WalletBuilder` + doc comment still says "CurrencyResponse". "Worst of both" — complete (field→`walletBuilder`) or revert. (arch)
- **★ M3 — `MarketingSendPolicy` has zero callers** (P3-1): the 정보통신망법 §50 night/consent gate is a `@Component` nothing invokes (documented intentional — no marketing-send path exists yet). Inert legal gate; wire on first send path or track follow-up. (security/arch)
- **★ M4 — Dark-mode leaks** (P4-4): `login.vue:13` inline `style="background: linear-gradient(...rgba(255,255,255,.45))"` stays white in dark (inline bypasses `.dark`); focus-ring `focus:ring-riso-sage/20` has no dark coverage; dual-track strategy (`dark:` inline at profile:54 vs `.dark` descendant elsewhere) will diverge. (quality/css)
- **★ M5 — `analytics-consent.client.ts`: `initialize()` failure swallowed**, `started=true` set regardless → GA silently never starts but app believes it did; later `disableAnalytics()` runs on never-inited GA. Wrap + set `started` only on confirmed init. (silent-failure)
- **M6 — Age-gate UTC-vs-local mismatch** (pre-existing): `new Date(birthDate)` parses UTC midnight vs local cutoff in `auth.ts:197` + `login.vue isAtLeast14` → boundary user mis-gated by ±1 day. Normalize both sides. autoFixable.
- **M7 — `UpgradeModal.vue:95` fallback `'BOTTLE'`** vs spec initial stage `POT` (pre-existing). Use `EvolutionStage.POT` or `v-if` guard.
- **M8 — `showRewardedAd()` returns `true` web/iOS with no ad-view proof** (pre-existing/intended); SSV is audit-only. Grant-without-proof; document accepted risk or enforce the 30s gate.

## LOW (selected)
EXP `10` hardcoded twice in `RecordService.kt:163,180` · `WalletBuilder` category IDs `1L–4L` magic · `provisionDomainProfile` bootstrap-fail log stripped in prod (no prod observability) · `INTERNAL_API_TOKEN` placeholder warns-not-throws (FE) · `V24` `users` unqualified vs V23 `public.activity_records` · profile consent UI omits photo/push toggles · `upgrade.buyButton` hardcodes `₩1,900` in both locales · `agreeAll` read-only-computed + `@change` pattern (correct, add comment) · profile template mixes `$t`/`t`.

## Verified-CLEAN (adversarial checks that passed)
- Payment fail-closed contract solid: IapVerifyController rejects `Disabled` in live, `UserMismatch`→401, `InvalidToken`→400, prod+test-mode double-guard.
- `create.before` consent check **correct**: `!== true` rejects `undefined` (not just `false`) — UI-bypass safe for email signup.
- PubSub malformed→200-ACK *after* dedup insert (avoids redelivery storm); verifier `isEnabled()` checked *before* dedup (forces redelivery on prod-misconfig).
- V24 DO-block backfill guard keys match V16 exactly (fail-closed before destructive DROP).
- Constant-time webhook token compare; no secrets/PII in logs (purchaseToken redacted); migrations static DDL (no injection).
- i18n ko/en key + placeholder parity clean (541=541).
- `internal`-for-test seam matches existing `FcmService.truncatePushText` pattern; namespace (com vs io.terraworld) per ADR-002; paired entity+migration (no half-migration).

---

## Action Items
- [ ] **High (session bugs — fix before commit)**: H1 consent-checkbox re-sync · H2 AdSense consent gate · H3 ATT status capture/fail-closed
- [ ] **High (launch decision)**: H4 sandbox-fallback default · H5 OAuth consent (before enabling social)
- [ ] **Medium (session)**: M1 $i18n align · M2 WalletBuilder rename finish · M3 MarketingSendPolicy wiring/track · M4 dark-mode leaks · M5 analytics init guard
- [ ] **Low/backlog**: pre-existing items (age-gate tz, EXP/category magic numbers, etc.)
