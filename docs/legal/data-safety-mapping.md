# 스토어 데이터 공시 매핑표

공고일: 2026-10-14 · 광고 관련 개정 시행일: 2026-11-13 00:00 (KST).
개정 [개인정보 처리방침](privacy.md)과 [이용약관](terms.md)에 대응합니다. 시행 전에는 보상형 광고 진입·ATT 요청·SDK 초기화·nonce 발급을 차단합니다.

## 서비스 정보

| 수집 항목 | Play Data Safety 분류 후보 | Apple App Privacy 분류 후보 | 목적·처리 |
| --- | --- | --- | --- |
| 이메일·닉네임·회원 식별번호·생년월일 | Personal info | Email Address / Name / User ID / Other Data Types | 계정 관리·연령 확인, 계정에 연결 |
| 활동 기록·메모·테라리움·재화 내역 | App activity | Other User Content / Other Data Types | 서비스 제공·보상, 계정에 연결 |
| 거리·시간 기록 | Health and fitness | Fitness | 기록 기능, 계정에 연결. 위치 좌표는 서버 미수집 |
| 친구 관계 | Contacts | Contacts | 친구 기능, 계정에 연결 |
| 이전 버전 사진 | Photos and videos | Photos or Videos | 기존 저장분만 보유, 새 사진 첨부 없음 |
| 세션·접속 IP·브라우저·기기 정보 | Device or other IDs / App info and performance | Identifiers / Diagnostics | 로그인 유지·보안 |
| Android 푸시 토큰 | Device or other IDs | Device ID | Android 푸시 동의 시 FCM 전송. 철회 시 비활성화, 계정 삭제 시 삭제 |
| 광고 시청·지급 기록, 1회용 시청 확인값·검증 거래 ID | App activity | Advertising Data / User ID | 광고 보상·중복 및 부정 지급 방지, 계정 삭제 시 파기. 지급 감사 기록은 처리방침 7조, 백업은 6조 |

## iOS Google Mobile Ads SDK

근거: 메인이 앱 번들의 `GoogleMobileAds.framework/PrivacyInfo.xcprivacy`를 확인한 선언과 [Google iOS 광고 SDK 공시 안내](https://developers.google.com/admob/ios/privacy/data-disclosure). 아래 연결·추적 여부는 해당 SDK 매니페스트 기준이며 앱 자체의 선언과 합산하여 App Store Connect에 입력해야 합니다.

| SDK 수집 항목 | Play Data Safety 분류 후보 | Apple App Privacy 유형 | 사용자 연결 | 추적 | 목적 |
| --- | --- | --- | --- | --- | --- |
| 광고 식별자(IDFA, ATT 허용 시)·기기 식별자 | Device or other IDs | Identifiers → Device ID (`DeviceID`) | 연결 | 추적 | 제3자 광고·개발자 광고·분석 |
| 광고 조회·시청 정보 | App activity | Usage Data → Advertising Data (`AdvertisingData`) | 연결 | 비추적 | 제3자 광고·개발자 광고·분석 |
| 앱·광고 상호작용 | App activity | Usage Data → Product Interaction (`ProductInteraction`) | 연결 | 비추적 | 제3자 광고·개발자 광고·분석 |
| IP 주소 기반 대략적 위치 | Location → Approximate location | Location → Coarse Location (`CoarseLocation`) | 연결 | 비추적 | 제3자 광고·개발자 광고·분석 |
| 성능 정보 | App info and performance | Diagnostics → Performance Data (`PerformanceData`) | 비연결 | 비추적 | 제3자 광고·개발자 광고·분석 |
| 충돌 정보 | App info and performance | Diagnostics → Crash Data (`CrashData`) | 비연결 | 비추적 | 제3자 광고·개발자 광고·분석 |
| 기타 진단 정보 | App info and performance | Diagnostics → Other Diagnostic Data (`OtherDiagnosticData`) | 비연결 | 비추적 | 제3자 광고·개발자 광고·분석 |

- Google LLC는 광고 요청·이용 시 AdMob SDK로 정보를 직접 수집하며, 수집한 정보를 미국 등 국외에서 처리할 수 있습니다. 보유 기간과 파기는 [Google 개인정보처리방침](https://policies.google.com/privacy)에 따릅니다. SDK 직접 수집은 처리방침 15조에서 안내하며, 운영팀의 처리위탁에 따른 국외 이전(10조)과 구분합니다. 문의는 [Google 개인정보 문의](https://support.google.com/policies/contact/general_privacy_form)로 보냅니다.
- 보상 검증용 회원 식별번호와 1회용 시청 확인값은 Google LLC에 시청 검증을 위탁하기 위해 광고 요청·이용 시 네트워크로 미국에 이전합니다(처리방침 9·10조). 보유 기간은 시청 검증 위탁 목적 달성 시까지이며, 구체적 보관은 Google 광고 데이터 처리 조건에 따릅니다. 서비스 서버는 IDFA를 직접 저장하지 않습니다.
- 맞춤형 광고는 iOS ATT `authorized`와 세션의 `user.adConsent === true`가 모두 성립할 때만 요청합니다. 그 외에는 `npa=true`로 비맞춤형 광고를 요청합니다. iOS 앱 설정의 맞춤형 광고 동의 토글은 기존 저장 경로를 사용하며, 철회하면 맞춤형 광고만 중단합니다. IDFA 제공 자체를 막으려면 iOS 설정에서 TerraWorld의 추적(ATT)을 거부해야 합니다.
- ATT 거부·광고 동의 철회는 맞춤형 광고를 거부하는 수단입니다. 비맞춤형 광고도 정보 수집·전송이 있으므로, Google의 광고 정보 수집·국외 이전을 원하지 않으면 광고를 이용하지 않아야 합니다. 광고 보상 외 기능에는 영향이 없습니다.
- 현재 운영 웹에는 광고를 표시하지 않으며 광고·추적 쿠키를 사용하지 않습니다. GA4·유료 상품은 운영하지 않습니다. Android 앱은 스토어 미출시이며 이번 도입은 iOS 보상형 광고입니다. Play 열은 분류 참고용이며 Android 출시 공시를 확정하지 않습니다.

## 게시·검증 인계

- 시행 시각은 `runtimeConfig.public.adsEffectiveAt`(기본 `2026-11-13T00:00:00+09:00`)이며 `NUXT_PUBLIC_ADS_EFFECTIVE_AT`로 덮어씁니다. 개발 검증도 같은 설정을 사용합니다. 잘못된 값은 현행 본문과 광고 차단을 유지합니다.
- 배포 담당자는 실제 공개 시각을 기록하고 공개일 + 30일이 시행일을 넘지 않는지 확인합니다. 공개가 늦으면 공지·문서 날짜와 시행 설정을 함께 조정해야 합니다.
- 법적 충분성·국외 이전 근거의 최종 판단, 스토어 개인정보 라벨 입력, 심사 제출은 메인 담당입니다. 본 표는 콘솔 입력이나 독립 법적 검토의 완료 근거가 아닙니다.
