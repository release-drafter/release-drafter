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
