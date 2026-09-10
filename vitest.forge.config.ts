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
    include: [
      'src/tests/integration/forge-conformance/gitea-forgejo.container.test.ts',
    ],
    globalSetup: [
      'src/tests/integration/forge-conformance/gitea-forgejo-global-setup.ts',
    ],
    coverage: { enabled: false },
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 240_000,
    testTimeout: 120_000,
    teardownTimeout: 30_000,
  },
})
