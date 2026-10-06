import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/artifacts/**/*.test.ts'],
    coverage: { enabled: false },
    testTimeout: 60000,
  },
})
