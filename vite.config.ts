import path from 'node:path'
import { builtinModules } from 'node:module'
import { defineConfig, UserConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import copy from 'rollup-plugin-copy'
import glob from 'glob'
import { fileURLToPath } from 'node:url'

const config = (): UserConfig => {
  /**
   * Maintain the file structure and export signatures,
   * by turning every file into an entry point.
   *
   * This is recommended over output.preserveModules that may tree-shake exports
   * as well as emit virtual files created by plugins
   * @see https://rollupjs.org/configuration-options/#input
   *
   * This is fed to rollupOptions.input
   * @see https://vite.dev/config/build-options#build-lib
   */
  const entry = Object.fromEntries(
    glob.sync('src/!(*tests)/**/*.ts').map((file) => [
      // This removes `src/` as well as the file extension from each
      // file, so e.g. src/nested/foo.js becomes nested/foo
      path.relative(
        'src',
        file.slice(0, file.length - path.extname(file).length)
      ),
      // This expands the relative paths to absolute paths, so e.g.
      // src/nested/foo becomes /project/src/nested/foo.js
      fileURLToPath(new URL(file, import.meta.url))
    ])
  )

  return defineConfig({
    plugins: [
      tsconfigPaths(),
      /**
       * Overwrites by default
       * @see https://github.com/jprichardson/node-fs-extra/blob/7.0.0/docs/copy.md#copysrc-dest-options-callback
       * @see https://www.npmjs.com/package/rollup-plugin-copy
       */
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
      lib: {
        formats: ['es'],
        entry
      },
      rollupOptions: {
        external: [
          ...builtinModules,
          ...builtinModules.map((module) => `node:${module}`)
        ],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js'
        }
      },
      emptyOutDir: true,
      sourcemap: false, // unsure this has any use
      minify: false
    },
    test: {
      isolate: true,
      include: ['src/tests/**/*.test.ts'],
      exclude: [...configDefaults.exclude],
      testTimeout: 60000,
      environment: 'node',
      setupFiles: ['src/tests/setup.ts'],
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
