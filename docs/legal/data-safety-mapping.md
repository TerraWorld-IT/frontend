# 스토어 데이터 공시 매핑표 (Play Data Safety / Apple App Privacy)

> ⚠️ **DRAFT — 초안.** 본 표는 [개인정보 처리방침](privacy.md) §2 수집 항목을 Google Play
> Data Safety / Apple App Privacy 공시 항목에 매핑한 것입니다. **콘솔 최종 입력값은 사업자/스토어
> 계정 보유자가 확정**(인간/외부 게이트)하며, 본 표는 입력 가이드입니다.
> 작성: 2026-06-23 (P3-5).

## 매핑 표

| 수집 항목 | Play Data Safety 분류 | Apple App Privacy 분류 | 수집 | 공유(제3자) | 목적 | 필수/선택 | 전송 암호화 | 삭제 요청 |
| --- | --- | --- | :---: | :---: | --- | --- | :---: | :---: |
| 이메일 | Personal info → Email address | Contact Info → Email Address | ✅ | ❌ | 계정·인증 | 필수 | ✅ | ✅ |
| 비밀번호 | (공시 비대상 — 단방향 해시 인증수단) | (공시 비대상) | — | — | 인증 | 필수 | ✅ | ✅(탈퇴) |
| 닉네임 | Personal info → Name | Contact Info → Name | ✅ | ❌ | 서비스 내 식별 | 필수 | ✅ | ✅ |
| 생년월일 | Personal info → Other info | User Content → Other (연령 확인) | ✅ | ❌ | 만 14세 미만 차단 | 필수 | ✅ | ✅ |
| 활동 기록 본문 | App activity → Other user-generated content | User Content → Other User Content | ✅ | ❌ | 핵심 기능 | 필수 | ✅ | ✅ |
| 사진 | Photos and videos → Photos | User Content → Photos or Videos | ✅ | ❌ | 사진 첨부(선택) | 선택 | ✅ | ✅ |
| 디바이스 정보(OS/브라우저/해상도) | Device or other IDs / App info and performance | Identifiers / Diagnostics | ✅ | ❌ | 호환성·보안(rate limit) | 필수 | ✅ | ✅ |
| 광고 식별자(GAID/IDFA) | Device or other IDs → Device ID | Identifiers → Device ID | ✅ | ✅ (AdMob/AdSense) | 광고 노출·측정 | 선택 | ✅ | OS 설정/ATT |
| FCM 토큰 | Device or other IDs (push token) | Identifiers → Device ID | ✅ | ❌ | 푸시 알림(선택) | 선택 | ✅ | ✅(해지) |
| GA4 분석 데이터(가명·집계) | App activity → App interactions / Analytics | Usage Data → Product Interaction | ✅ | ❌ | 이용 분석(선택) | 선택 | ✅ | OS 설정/Opt-out |
| 결제 영수증(purchaseToken/productId) | Financial info → Purchase history | Purchases → Purchase History | ✅ | ❌ | 결제 검증·환불 | 필수(결제 시) | ✅ | 법령 보존 후 파기 |
| 신용카드 정보 | (미수집 — Apple/Google 결제 위임) | (미수집) | ❌ | — | — | — | — | — |
| 위치정보 | (미수집 — [privacy §9의2](privacy.md)) | (미수집) | ❌ | — | — | — | — | — |

## 공시 시 주의 (정합 포인트)

- **광고 식별자·GA4 는 "선택"** 으로 공시 — 앱 내 opt-in 게이트(GA4: `analyticsConsent`, iOS: ATT)와
  정합해야 함. "필수"로 공시하면 [privacy.md](privacy.md) §2.2 표기와 모순. (P2-2 / P3-3 구현 정합)
- **광고 식별자는 "데이터 공유(sharing)"** 로 표기 — AdMob/AdSense 가 자사 광고·측정 목적으로도 처리
  ([privacy.md](privacy.md) §4 제3자 제공·공유와 정합).
- **데이터 암호화 전송(in transit)**: 전 항목 HTTPS(TLS 1.2+) — Data Safety 의 "Data is encrypted in
  transit" = 예.
- **데이터 삭제 요청 경로 제공**: 탈퇴 + privacy@terraworld.app — Data Safety 의 "users can request
  data deletion" = 예.

## 인간/외부 게이트 (본 표로 대체 불가)

- [ ] Play Console → Data safety form **최종 입력**
- [ ] App Store Connect → App Privacy **최종 입력**
- [ ] 광고/분석 "선택" 운영 정책 확정(사업) — opt-in 유지 vs "필수" 전환
