import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
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
