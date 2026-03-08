import { builtinModules } from 'node:module'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    copy({
      targets: [
        {
          src: 'action.yml',
          dest: 'drafter/',
          transform: (contents) =>
            contents
              .toString()
              .replace(
                'main: dist/actions/drafter/run.js',
                'main: ../dist/actions/drafter/run.js'
              )
        }
      ]
    })
  ],
  build: {
    target: 'node24',
    rollupOptions: {
      external: (id) => id.startsWith('node:') || builtinModules.includes(id),
      input: {
        'actions/drafter/run': 'src/actions/drafter/run.ts',
        'actions/autolabeler/run': 'src/actions/autolabeler/run.ts'
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        paths: (id) => builtinModules.includes(id) ? `node:${id}` : id
      }
    },
    minify: false
  },
  test: {
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 60000,
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      enabled: true,
      reporter: ['json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/tests/**/*.ts',
        'src/scripts/**/*',
        'src/**/*.generated.ts'
      ]
    }
  }
})
