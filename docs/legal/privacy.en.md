# TerraWorld Privacy Policy (Draft)

> ⚠️ **DRAFT — English translation of the Korean original ([privacy.md](privacy.md)). NOT legally binding. Lawyer review + business info + DPO designation required before publication. The Korean version prevails in case of any discrepancy.**
> Translation draft (P4-8, 2026-06-23). Legal sufficiency is the lawyer's domain (§7 handoff).

- **Effective date**: (to be specified after business/legal confirmation)
- **Version**: v0.3-draft (translation of Korean v0.3-draft)
- **Legal basis**: Personal Information Protection Act (PIPA), Network Act, GDPR (EU users — Phase 5+)

---

## Article 1 (Purpose of Collection and Use)

The Company collects and uses personal data for the following purposes:

| Purpose | Items |
| --- | --- |
| Registration & authentication | Email, password (scrypt one-way hash), nickname |
| Service provision | Activity records, virtual goods (Dew, Sunshine, tokens), terrarium arrangement, friend relationships |
| Payment | Payment receipt (Play Billing / Apple IAP), refund / withdrawal handling |
| Push notifications | FCM token (Firebase Cloud Messaging) |
| Marketing & analytics | Google Analytics 4 (pseudonymized/aggregated analytics, no personal identifiers sent), advertising identifier (AdMob rewarded ads) |

## Article 2 (Items Collected + Required/Optional Consent)

Per PIPA Article 15: required/optional consent items + right to refuse + disadvantages of refusal.

### 2.1 At registration

| Item | Consent | Disadvantage of refusal |
| --- | --- | --- |
| Email address | **Required** | Cannot register (account ID + password reset channel) |
| Password (scrypt one-way hash, plaintext not stored) | **Required** | Cannot register (authentication) |
| Nickname | **Required** | Cannot register (in-service user identification) |
| Date of birth (to verify the under-14 block) | **Required** | Cannot register (children's data under PIPA — those under 14 cannot be processed without a legal guardian's consent; this Service blocks registration) |

### 2.2 During use (automatically collected)

| Item | Consent | Disadvantage of refusal |
| --- | --- | --- |
| Activity record content (walk/read/run/doodle/custom) | **Required** | Core features unavailable |
| Photos (stored in Cloudflare R2) | **Optional** | None (no photo attachment; text records only) |
| Device info (OS / browser / resolution) | **Required** | Compatibility and security (rate limit) cannot work |
| Advertising ID (Android GAID / iOS IDFA) | **Optional** | No ad personalization (general ads shown) |
| FCM token (push) | **Optional** | No push notifications (attendance / wilt / friend activity) |
| GA4 analytics data (pseudonymized/aggregated) | **Optional** | None (can opt out in **Profile > Consent management** + GA Opt-out add-on / device tracking limit / iOS ATT) |

### 2.3 At payment (delegated to Play Billing / Apple IAP)

| Item | Consent | Disadvantage of refusal |
| --- | --- | --- |
| Payment receipt ID (purchaseToken) | **Required** (at payment) | Cannot proceed with payment |
| Purchased product ID | **Required** (at payment) | Cannot proceed with payment |
| Credit card info | **Not collected** | — Delegated to Google / Apple payment systems (not held by the Company) |

### 2.4 How to exercise the right to refuse

- At registration: refusing required items results in registration refusal. Refusing optional items allows registration (the relevant feature is disabled).
- During use: you can withdraw or re-grant marketing/analytics/ad consent directly in **Profile > Consent management** (or request via privacy@terraworld.app). Ads/analytics can also be refused immediately via device OS settings / ATT.
- Inquiries / consent withdrawal: privacy@terraworld.app (activated after review).

## Article 3 (Retention and Use Period)

| Category | Retention period |
| --- | --- |
| Member info (email, nickname) | Deleted immediately upon withdrawal |
| Activity records / terrarium / friend relationships | Deleted immediately upon withdrawal |
| Photos (R2) | Originals deleted immediately upon withdrawal. DR technical backups are not used beyond recovery and are auto-destroyed within 30 days |
| Payment records | 5 years (Electronic Commerce Act) |
| Refund / withdrawal records | 3 years (Electronic Commerce Act) |
| Ad / analytics data | Per GA4 property retention setting (2 or 14 months) |
| Access logs | 3 months (Network Act) |

## Article 3-2 (Destruction Procedure and Method)

When personal data becomes unnecessary due to the lapse of the retention period or achievement of the purpose, the Company destroys it without delay (PIPA Article 21).

1. **Procedure**: data that has become unnecessary due to withdrawal or purpose achievement is immediately classified for destruction. Data subject to a statutory retention obligation (Article 3 — payment/withdrawal records) is stored separately and destroyed after the retention period lapses.
2. **Method**:
   - Electronic files: permanently deleted in an unrecoverable manner (DB record deletion + Cloudflare R2 object deletion). Data in DR technical backups is not used beyond recovery and is auto-destroyed within 30 days.
   - Non-electronic (printed): shredded or incinerated (currently no non-electronic holdings).
3. **Timing**: immediately upon withdrawal (except statutory-retention items), DR backups within 30 days, analytics/ad data per the GA4 property retention setting (2 or 14 months).

## Article 4 (Provision/Sharing to Third Parties)

The Company provides/shares personal data with third parties only in the following cases:

1. Where the user has separately consented in advance.
2. Lawful procedures under the law (investigative agency request / court warrant, etc.).
3. **Advertising display/measurement based on advertising identifiers (Google AdMob / AdSense)**: the ad SDK provider processes advertising identifiers (GAID/IDFA) and device/access info for ad serving, click-fraud prevention, and performance measurement, and may also use them for its own advertising/measurement purposes — therefore treated as **third-party provision (sharing)** rather than mere delegation. See [Google's advertising policy](https://policies.google.com/technologies/ads). To refuse: device OS "Limit ad tracking" (Android) / App Tracking Transparency (ATT, iOS).

## Article 5 (Delegation of Processing)

The Company delegates the following to third parties, who are prohibited from using the data beyond the delegated purpose or re-delegating it:

| Delegatee | Delegated work | Retention/destruction |
| --- | --- | --- |
| Google LLC (GA4) | Service usage analytics (pseudonymized/aggregated) | Per GA4 property retention (2 or 14 months) |
| Google LLC (Firebase FCM) | Push notification delivery | On token disposal / notification opt-out |
| Cloudflare, Inc. | Photo/static asset storage (R2) · CDN · DDoS protection | Originals deleted immediately on withdrawal (backups destroyed within 30 days) |
| Apple Inc. / Google LLC | IAP receipt verification (App Store / Play Billing) | Per payment-record retention |

## Article 5-2 (Overseas Transfer)

The above delegatees/ad providers are located overseas, so personal data is transferred abroad (PIPA Article 28-8):

| Recipient | Country | Items | Timing/method | Purpose | Retention | Refusal & disadvantage |
| --- | --- | --- | --- | --- | --- | --- |
| Google LLC | USA | Pseudonymized analytics / FCM token / advertising ID | Network transmission during use | Analytics, push, ads | Per each delegation/provision item | OS tracking limit · ATT / analytics refusal — some features/personalized ads limited |
| Cloudflare, Inc. | USA & global edge | Photos / static assets | Transmitted on upload/view | Storage, delivery, security | Deleted on withdrawal | Text records only if no photo attached |
| Apple Inc. | USA | Payment receipt / transaction ID | Transmitted at payment | Payment verification | Per payment retention | No payment |

## Article 6 (User Rights)

Users may exercise the following rights:

1. **Right to access**: view your own profile/activity records in-service. For other held data, request via privacy@terraworld.app (replied to after processing).
2. **Right to correct**: change nickname/email in-service. Other corrections via the above email.
3. **Right to delete**: delete activity records in-service + account/content deleted immediately on withdrawal (except statutory-retention data — Article 3).
4. **Right to suspend processing**: withdrawal (processed immediately).
5. **Right to data portability** (GDPR): automatic export is **not currently provided** — fulfilled manually on request (JSON export UI planned).
6. **Ad/analytics refusal**: you may decline to watch ads (no reward). You can turn marketing/analytics/ad consent on or off directly in **Profile > Consent management**, and also refuse via the device OS "Limit ad tracking", iOS ATT, or the GA Opt-out add-on.

GDPR compliance (EU users — when the English service is introduced):

- Data Protection Officer (DPO) designation
- Data Subject Access Request (DSAR) response within 30 days
- Breach notification to the supervisory authority within 72 hours

## Article 7 (Security Measures)

1. **Encryption**: password scrypt one-way hash, JWT RS256 signature, HTTPS (TLS 1.2+) enforced in transit.
2. **Access control**: better-auth session (HttpOnly · SameSite=Strict cookie, 7 days), authentication/service data schema separation.
3. **DB security**: PostgreSQL 16, DB access control and regular backups.
4. **Security headers**: X-Frame-Options / X-Content-Type-Options / Strict-Transport-Security, etc.
5. **Vulnerability checks**: CodeQL static analysis (every PR + scheduled scans).
6. **Rate limiting**: Redis-based per-user/IP gating.

## Article 8 (Processing of Those Under 14)

The Company does not accept registration from those under 14. If a user is confirmed to be under 14, the account and data are deleted immediately and the guardian is notified.

## Article 9 (Cookies / Tracking)

The Service uses the following tracking technologies (see [Terms Article 9-4](terms.md)):

- **Essential**: `tw.session_token` authentication cookie
- **Functional**: dark mode / language / design preference (localStorage)
- **Analytics**: GA4 (`_ga`, `_gid`, etc. — pseudonymized/aggregated, no personal identifiers sent)
- **Advertising**: AdMob / AdSense ad personalization

## Article 9-2 (Location Data)

The Service does not collect location data via GPS, base stations, Wi-Fi, etc. If location-based features are introduced in the future, separate consent will be obtained under the Act on the Protection and Use of Location Information.

## Article 10 (Notice of Changes)

Changes to this policy are announced via in-service notice and push notification at least 7 days before they take effect.

## Article 11 (Chief Privacy Officer)

- **Name**: (to be specified after review)
- **Contact**: privacy@terraworld.app (activated after review)
- **Address**: (business registration info)

---

**References**: [Terms of Service](terms.md) · [Store data disclosure mapping](data-safety-mapping.md) · Korean original [privacy.md](privacy.md)
