import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    include: ['src/tests/artifacts/**/*.test.ts'],
    coverage: { enabled: false },
    testTimeout: 60000,
  },
})
