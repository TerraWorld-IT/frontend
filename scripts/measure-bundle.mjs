#!/usr/bin/env node
// measure-bundle.mjs — UltraPlan M11
//
// .output/public/_nuxt/*.js 의 size + gzipped size 측정 → bundle-report.json 출력.
// 비교 모드 (--compare bundle-baseline.json) 로 size diff 계산 + warn/fail threshold.
//
// Usage:
//   node frontend/scripts/measure-bundle.mjs                                 # 측정만, stdout
//   node frontend/scripts/measure-bundle.mjs --output bundle-baseline.json   # baseline 저장
//   node frontend/scripts/measure-bundle.mjs --compare bundle-baseline.json  # diff 검증

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = resolve(__dirname, '..')
const NUXT_DIR = resolve(FRONTEND_ROOT, '.output', 'public', '_nuxt')

// thresholds (Phase 3 enforcement — UltraPlan M11)
const WARN_BYTES_PER_CHUNK = 10 * 1024     // +10KB per chunk
const WARN_PCT_PER_CHUNK = 20              // +20%
const FAIL_BYTES_PER_CHUNK = 50 * 1024     // +50KB per chunk
const FAIL_PCT_PER_CHUNK = 50              // +50%

function listJs(dir) {
  const entries = readdirSync(dir)
  return entries
    .filter((e) => e.endsWith('.js'))
    .map((name) => {
      const path = resolve(dir, name)
      const buf = readFileSync(path)
      return {
        name,
        bytes: statSync(path).size,
        gzipped: gzipSync(buf, { level: 9 }).length,
      }
    })
}

function summarize(chunks) {
  const total = chunks.reduce((a, c) => a + c.bytes, 0)
  const totalGzip = chunks.reduce((a, c) => a + c.gzipped, 0)
  const main = [...chunks].sort((a, b) => b.bytes - a.bytes)[0]
  return { totalBytes: total, totalGzipBytes: totalGzip, chunkCount: chunks.length, largestChunk: main }
}

function emitJson({ chunks, summary }) {
  return JSON.stringify({
    capturedAt: new Date().toISOString(),
    nuxtDir: '.output/public/_nuxt',
    summary,
    chunks: chunks.sort((a, b) => b.bytes - a.bytes).map((c) => ({
      name: c.name,
      bytes: c.bytes,
      gzipped: c.gzipped,
    })),
  }, null, 2)
}

function compare(current, baselinePath) {
  // Codex code-review CDX-005 (2026-05-18): baseline 부재 시 graceful **return true**.
  // 이전 `return` (undefined) 는 main() 의 `pass ? 0 : 1` 에서 falsy → exit 1 →
  // CI continue-on-error 제거 후 첫 실행이 항상 fail. true 반환으로 advisory PASS.
  try {
    readFileSync(baselinePath, 'utf8')
  } catch {
    process.stderr.write(`[measure-bundle] baseline not found at ${baselinePath} — skipping diff (advisory PASS).\n`)
    return true
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  // chunk-level comparison (future: per-file size thresholds)
  // const byName = (arr) => Object.fromEntries(arr.chunks.map((c) => [c.name, c]))
  // const _bMap = byName(baseline)
  // const _cMap = byName(current)

  const warnings = []
  const failures = []

  // 본 비교는 file name 가 hash 기반이라 1:1 매칭 안 됨 — total + max chunk size 만 비교.
  const tDiff = current.summary.totalBytes - baseline.summary.totalBytes
  const tDiffPct = baseline.summary.totalBytes > 0 ? (tDiff / baseline.summary.totalBytes) * 100 : 0
  process.stdout.write(`Total bytes diff: ${tDiff >= 0 ? '+' : ''}${tDiff} (${tDiffPct.toFixed(1)}%)\n`)

  const mcDiff = current.summary.largestChunk.bytes - baseline.summary.largestChunk.bytes
  const mcDiffPct = baseline.summary.largestChunk.bytes > 0
    ? (mcDiff / baseline.summary.largestChunk.bytes) * 100
    : 0
  process.stdout.write(`Largest chunk bytes diff: ${mcDiff >= 0 ? '+' : ''}${mcDiff} (${mcDiffPct.toFixed(1)}%)\n`)

  // largest chunk threshold
  if (Math.abs(mcDiff) > FAIL_BYTES_PER_CHUNK || Math.abs(mcDiffPct) > FAIL_PCT_PER_CHUNK) {
    failures.push(`Largest chunk size delta exceeded FAIL threshold: ${mcDiff}B (${mcDiffPct.toFixed(1)}%)`)
  } else if (Math.abs(mcDiff) > WARN_BYTES_PER_CHUNK || Math.abs(mcDiffPct) > WARN_PCT_PER_CHUNK) {
    warnings.push(`Largest chunk size delta exceeded WARN threshold: ${mcDiff}B (${mcDiffPct.toFixed(1)}%)`)
  }

  for (const w of warnings) process.stderr.write(`⚠️  ${w}\n`)
  for (const f of failures) process.stderr.write(`❌ ${f}\n`)

  return failures.length === 0
}

function main() {
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--output')
  const cmpIdx = args.indexOf('--compare')

  try {
    statSync(NUXT_DIR)
  } catch {
    process.stderr.write(`ERROR: ${NUXT_DIR} 부재 — 먼저 'bun run build' 실행 필요\n`)
    process.exit(2)
  }

  const chunks = listJs(NUXT_DIR)
  const summary = summarize(chunks)
  const data = { chunks, summary }
  const json = emitJson(data)

  if (outIdx >= 0 && args[outIdx + 1]) {
    const outPath = resolve(FRONTEND_ROOT, args[outIdx + 1])
    writeFileSync(outPath, json + '\n', 'utf8')
    process.stdout.write(`Baseline saved: ${args[outIdx + 1]}\n`)
  } else if (cmpIdx >= 0 && args[cmpIdx + 1]) {
    const cmpPath = resolve(FRONTEND_ROOT, args[cmpIdx + 1])
    const pass = compare({ chunks, summary }, cmpPath)
    process.exit(pass ? 0 : 1)
  } else {
    process.stdout.write(json + '\n')
  }

  process.stdout.write(`\nTotal: ${summary.totalBytes} bytes (${(summary.totalBytes / 1024).toFixed(1)} KB)\n`)
  process.stdout.write(`Total gzipped: ${summary.totalGzipBytes} bytes (${(summary.totalGzipBytes / 1024).toFixed(1)} KB)\n`)
  process.stdout.write(`Chunks: ${summary.chunkCount}\n`)
  process.stdout.write(`Largest: ${summary.largestChunk.name} (${(summary.largestChunk.bytes / 1024).toFixed(1)} KB)\n`)
}

main()
