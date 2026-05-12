import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    include: ['tests/**/*.test.ts'],
    coverage: {
      // 도입 1단계 — 리포트만 생성, threshold 강제 없음.
      // baseline 측정 후 다음 PR 에서 coverage.thresholds 추가 예정.
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: 'coverage',
      include: [
        'app/composables/**/*.ts',
        'app/utils/**/*.ts',
        'app/stores/**/*.ts',
        'app/lib/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        'app/**/__tests__/**',
        'tests/**',
        '.nuxt/**',
        '.output/**',
        'node_modules/**',
      ],
    },
  },
})
