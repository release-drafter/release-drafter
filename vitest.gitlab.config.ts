import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/tests/integration/gitlab/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['src/tests/integration/gitlab/gitlab-global-setup.ts'],
    coverage: { enabled: false },
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 1,
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 20 * 60_000,
    testTimeout: 2 * 60_000,
    teardownTimeout: 2 * 60_000,
  },
})
