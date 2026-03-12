import { builtinModules } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { defineConfig, type Plugin } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const FROM = 'main: dist/actions/drafter/run.js'
const TO = 'main: ../dist/actions/drafter/run.js'

function syncDrafterActionYml(): Plugin {
  return {
    name: 'sync-drafter-action-yml',
    async closeBundle() {
      const [src, dest] = await Promise.all([
        readFile('action.yml', 'utf8'),
        readFile('drafter/action.yml', 'utf8')
      ])
      const expected = src.includes(FROM) ? src.replace(FROM, TO) : src
      if (dest !== expected) {
        await writeFile('drafter/action.yml', expected)
      }
    }
  }
}

export default defineConfig({
  plugins: [tsconfigPaths(), syncDrafterActionYml()],
  // GitHub Actions libraries read inputs and context from process.env at runtime.
  // Preserve those accesses in the actual build environment instead of replacing
  // them with empty objects during bundling.
  environments: {
    client: {
      keepProcessEnv: true
    }
  },
  build: {
    target: 'node24',
    rollupOptions: {
      // platform: 'node' makes rolldown generate a createRequire-based __require
      // for CJS modules (e.g. undici via @actions/github) instead of the default
      // stub that throws in ESM environments without a global `require`.
      // @ts-expect-error remove this when vite support for rolldown is stable
      platform: 'node',
      external: (id) => id.startsWith('node:') || builtinModules.includes(id),
      input: {
        'actions/drafter/run': 'src/actions/drafter/run.ts',
        'actions/autolabeler/run': 'src/actions/autolabeler/run.ts'
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        paths: (id) => (builtinModules.includes(id) ? `node:${id}` : id)
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
