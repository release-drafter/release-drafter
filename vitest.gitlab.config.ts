import { defaultClientConditions, defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

const WORKSPACE_SOURCE_CONDITION = 'release-drafter-source'

export default defineConfig({
  resolve: {
    conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultClientConditions],
    tsconfigPaths: true,
  },
  environments: {
    ssr: {
      resolve: {
        conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultServerConditions],
      },
    },
  },
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
