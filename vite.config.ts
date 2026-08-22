import { builtinModules } from 'node:module'
import { defaultClientConditions, defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

const WORKSPACE_SOURCE_CONDITION = 'release-drafter-source'

export default defineConfig({
  resolve: {
    conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultClientConditions],
    tsconfigPaths: true,
  },
  // GitHub Actions libraries read inputs and context from process.env at runtime.
  // Preserve those accesses in the actual build environment instead of replacing
  // them with empty objects during bundling.
  environments: {
    client: {
      keepProcessEnv: true,
    },
    ssr: {
      resolve: {
        conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultServerConditions],
      },
    },
  },
  build: {
    target: 'node24',
    rolldownOptions: {
      // platform: 'node' makes rolldown generate a createRequire-based __require
      // for CJS modules (e.g. undici via @actions/github) instead of the default
      // stub that throws in ESM environments without a global `require`.
      platform: 'node',
      external: (id) => id.startsWith('node:') || builtinModules.includes(id),
      input: {
        'actions/drafter/run': 'packages/gh-actions/src/drafter/run.ts',
        'actions/autolabeler/run': 'packages/gh-actions/src/autolabeler/run.ts',
        'actions/check-pr/run': 'packages/gh-actions/src/check-pr/run.ts',
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        paths: (id) => (builtinModules.includes(id) ? `node:${id}` : id),
      },
    },
    minify: false,
  },
  test: {
    include: ['src/tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    testTimeout: 60000,
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      enabled: true,
      reporter: ['json-summary'],
      include: ['src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: [
        'src/tests/**/*.ts',
        'packages/*/src/**/*.test.ts',
        'src/scripts/**/*',
        'src/**/*.generated.ts',
        'packages/*/src/**/*.generated.ts',
      ],
    },
  },
})
