# TerraWorld Mobile — 리포 현황 요약

> 작성: 2026-04-10 (Figma sync loop Round 11)
> 기준 리포: https://github.com/TerraWorld-IT/mobile

## 상태: 리포 생성됨, 코드 없음

| 항목 | 값 |
|------|-----|
| org | TerraWorld-IT |
| repo | mobile |
| description | TerraWorld Mobile App - Capacitor WebView |
| created/pushed | 2026-04-06 |
| 커밋 | 0 (빈 저장소) |
| 기본 브랜치 | 미설정 |
| 사용 언어 | 미정 (코드 없음) |

## 로컬 경로

```
D:\01.Work\08.rf\TerraWorld\mobile\   (clone됨, 내용 없음)
```

## 계획 (DEVELOPMENT_PLAN_v2.md 기준)

- **목적**: Capacitor WebView로 Nuxt frontend를 iOS/Android 앱으로 래핑
- **Phase 3~4** 일정 (~11월): 소셜 로그인, 결제, 인스타 공유 최적화
- Capacitor 플러그인: `@capacitor/camera`, `@capacitor/share`, `@capacitor/haptics`

## 다음 단계 (추천)

1. org admin(RoastFried-RF)이 Capacitor 프로젝트 초기 scaffold 진행
2. `npx @capacitor/create-app` 또는 `npm init @capacitor/app` 으로 초기화
3. `capacitor.config.ts`에서 `webDir: '../frontend/.output/public'` 설정
4. iOS/Android 타겟 추가: `npx cap add ios && npx cap add android`
5. CI workflow(`.github/workflows/mobile.yml`) 추가 — Nuxt build → cap sync → 아티팩트

## 참고

- frontend Dockerfile 및 배포 파이프라인은 `frontend/.github/workflows/` 참고
- 모바일 배포 전 `bun run build`가 선행되어야 Capacitor가 올바른 assets을 번들링
