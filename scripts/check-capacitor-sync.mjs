#!/usr/bin/env node
// /analyze 2026-05-18 발견 (Codex C-10): frontend/package.json 과 mobile/package.json
// 양쪽에 `@capacitor/*` 11개 동일 버전 중복 선언. drift guard 없음 — 한쪽만 bump 시
// CI 가 막지 못함. 본 script 가 lefthook pre-commit 에서 양쪽 동기 강제.
//
// Toolkit skill 참조: universal/mobile/capacitor-split-package-sync-check
//
// 동작:
//   1. frontend/package.json 과 ../mobile/package.json 의 `@capacitor*` 및 `@capacitor-community*`
//      의존성 추출 (dependencies + devDependencies 모두).
//   2. 양쪽 패키지명 합집합 순회. 한쪽만 있거나 버전 mismatch 면 fail.
//   3. CI 가 아니라 lefthook 에서 실행 — fast feedback.
//
// 종료 코드: 0 = 정합, 1 = drift 검출.

import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendPkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
const mobilePkgPath = resolve(here, '..', '..', 'mobile', 'package.json')

let mobilePkg
try {
  mobilePkg = JSON.parse(readFileSync(mobilePkgPath, 'utf8'))
} catch {
  // silently skip if mobile/package.json doesn't exist
  process.exit(0)
}

function capacitorDeps(pkg) {
  const all = { ...pkg.dependencies, ...pkg.devDependencies }
  const result = {}
  for (const [name, version] of Object.entries(all)) {
    if (name.startsWith('@capacitor/') || name.startsWith('@capacitor-community/')) {
      result[name] = version
    }
  }
  return result
}

const fe = capacitorDeps(frontendPkg)
const mo = capacitorDeps(mobilePkg)

const allNames = new Set([...Object.keys(fe), ...Object.keys(mo)])
const drifts = []

// Native-only 패키지는 frontend 부재 정상 (mobile 빌드 도구).
const NATIVE_ONLY = new Set([
  '@capacitor/android',
  '@capacitor/ios',
  '@capacitor/cli',
])

for (const name of allNames) {
  // 양쪽 모두 있을 때만 버전 비교. 한쪽만 있는 경우는 정책상 허용 (frontend bridge
  // 가 필요한 모듈은 양쪽 등록되므로, frontend 부재 = 의도된 native-only).
  if (fe[name] && mo[name] && fe[name] !== mo[name]) {
    drifts.push(`${name}: frontend=${fe[name]} ↔ mobile=${mo[name]}`)
  }
  // 보조 룰: native-only 외 패키지가 mobile 만 있으면 의심
  if (!fe[name] && mo[name] && !NATIVE_ONLY.has(name)) {
    drifts.push(`${name}: mobile=${mo[name]} (frontend bridge import 필요할 가능성)`)
  }
}

if (drifts.length > 0) {
  process.stderr.write('[capacitor-sync] drift detected:\n')
  for (const d of drifts) process.stderr.write(`  - ${d}\n`)
  process.stderr.write('\nResolution: Sync @capacitor/* versions between frontend/mobile package.json\n')
  process.exit(1)
}

process.stdout.write(`[capacitor-sync] ${allNames.size} packages in sync ✓\n`)
process.exit(0)
