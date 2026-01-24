import { resolve } from 'node:path'
import { builtinModules } from 'node:module'
import { defineConfig, UserConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import copy from 'rollup-plugin-copy'

const config = (): UserConfig => {
  const entry = ['drafter', 'autolabeler']
    .map((action) => ({
      [`${action}/run`]: resolve(__dirname, `src/actions/${action}/run.ts`)
    }))
    .reduce((acc, cur) => ({ ...acc, ...cur }), {})

  return defineConfig({
    plugins: [
      tsconfigPaths(),
      /**
       * Overwrites by default
       * @see https://github.com/jprichardson/node-fs-extra/blob/7.0.0/docs/copy.md#copysrc-dest-options-callback
       * @see https://www.npmjs.com/package/rollup-plugin-copy
       */
      copy({
        verbose: true,
        targets: [
          {
            src: 'action.yml',
            dest: 'drafter/',
            transform: (contents) =>
              contents
                .toString()
                .replace(
                  'main: dist/drafter/run.js',
                  'main: ../dist/drafter/run.js'
                )
          }
        ]
      })
    ],
    build: {
      target: 'node24',
      lib: {
        formats: ['es'],
        entry
      },
      rollupOptions: {
        external: [
          ...builtinModules,
          ...builtinModules.map((module) => `node:${module}`)
        ],
        input: entry,
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          preserveModules: true
        }
      },
      emptyOutDir: true,
      sourcemap: true,
      minify: false
    },
    test: {
      isolate: true,
      include: ['src/tests/**/*.test.ts'],
      exclude: [...configDefaults.exclude],
      testTimeout: 60000,
      environment: 'node',
      coverage: {
        enabled: true, // will run along tests
        reporter: ['json-summary'],
        include: ['src/**/*.ts'],
        exclude: ['src/tests/**/*.ts']
      }
    }
  })
}

export default config
