#!/usr/bin/env node
// UltraPlan v3 I-DEAD-KEY-001 — i18n dead key detection.
//
// 본 script:
//   1. `i18n/locales/ko.json` (SoT) 를 평탄화 (`common.loading` 등 dot-path)
//   2. `app/` 디렉토리 전체에서 `t('...')`, `$t('...')`, `i18n.t('...')` 패턴 grep
//   3. dead keys (declared but unused) 와 missing keys (used but undeclared) 양쪽 보고
//
// CI / lefthook pre-commit 통합. 검출 시 exit 1 (BLOCKING).
//
// 단계적 다국어 전략 (ADR-005):
//   - Phase 4 (현재): ko hardcoded 잔존 + i18n 파일 일부만 사용 (`$t()` 0건 — analyze 2026-05-18 검증)
//   - Phase 5+: I-T-MIGRATE-001 완료 후 본 script 실 가치 발휘 (현재는 advisory)
//
// 종료 코드:
//   0 — dead/missing 모두 0
//   1 — dead key 1+ 또는 missing key 1+
//
// CI 통합 시 advisory phase 는 `|| true` 로 warn 만, strict phase 는 exit 1 강제.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '..')
const koJsonPath = join(frontendRoot, 'i18n', 'locales', 'ko.json')
const appDir = join(frontendRoot, 'app')

function flatten(obj, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value, path))
    } else {
      result[path] = value
    }
  }
  return result
}

function walkVueTsFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.nuxt' || entry === '.output') continue
      walkVueTsFiles(full, results)
    } else if (entry.endsWith('.vue') || entry.endsWith('.ts')) {
      results.push(full)
    }
  }
  return results
}

const ko = JSON.parse(readFileSync(koJsonPath, 'utf8'))
const koFlat = flatten(ko)
const declared = new Set(Object.keys(koFlat))

const files = walkVueTsFiles(appDir)
const used = new Set()

const tCallPattern = /(?<![A-Za-z0-9_$])(?:\$t|i18n\.t|t)\(\s*['"`]([a-zA-Z0-9_.]+)['"`]\s*[,)]/g

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  let match
  while ((match = tCallPattern.exec(text)) !== null) {
    used.add(match[1])
  }
}

const dead = [...declared].filter((k) => !used.has(k))
const missing = [...used].filter((k) => !declared.has(k))

const STRICT = process.env.I18N_STRICT === '1'

process.stdout.write(`[i18n] declared keys: ${declared.size}\n`)
process.stdout.write(`[i18n] used keys (across ${files.length} files): ${used.size}\n`)
process.stdout.write(`[i18n] dead keys (declared, unused): ${dead.length}\n`)
process.stdout.write(`[i18n] missing keys (used, undeclared): ${missing.length}\n`)

if (missing.length > 0) {
  process.stderr.write('\n[i18n] missing keys (likely typo or undeclared):\n')
  for (const k of missing.slice(0, 20)) process.stderr.write(`  - ${k}\n`)
  if (missing.length > 20) process.stderr.write(`  ... +${missing.length - 20} more\n`)
}

if (dead.length > 0 && STRICT) {
  process.stderr.write('\n[i18n] dead keys (declared but unused):\n')
  for (const k of dead.slice(0, 20)) process.stderr.write(`  - ${k}\n`)
  if (dead.length > 20) process.stderr.write(`  ... +${dead.length - 20} more\n`)
}

// Phase 4 advisory: missing 만 BLOCKING (실 typo). dead 는 strict mode 에서만.
const failed = missing.length > 0 || (STRICT && dead.length > 0)
process.exit(failed ? 1 : 0)
