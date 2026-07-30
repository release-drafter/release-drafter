import { defineConfig } from 'vitest/config'

/**
 * Container-backed compatibility tests, run by `npm run test:container`.
 *
 * These need a real network and the real config loader, so they deliberately do
 * not load `src/tests/setup.ts`: it calls `nock.disableNetConnect()`, which would
 * sever both the Docker socket and the forge itself, and it replaces the config
 * module with a mock.
 *
 * Booting a server per flavor is slow, so the suites run sequentially with a
 * generous timeout rather than racing for the daemon.
 */
export default defineConfig({
  test: {
    include: ['src/tests/**/*.container.test.ts'],
    globalSetup: ['src/tests/helpers/forge-global-setup.ts'],
    testTimeout: 60_000,
    coverage: { enabled: false },
  },
})
