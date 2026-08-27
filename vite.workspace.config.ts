import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, resolve } from 'node:path'
import { dts } from 'rolldown-plugin-dts'
import { defaultClientConditions, defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

const WORKSPACE_SOURCE_CONDITION = 'release-drafter-source'
const packageJson = process.env.npm_package_json
if (!packageJson)
  throw new Error('npm_package_json is required to build a workspace')
const workspaceRoot = dirname(packageJson)
const workspaceManifest = JSON.parse(readFileSync(packageJson, 'utf8')) as {
  dependencies?: Record<string, unknown>
}
const workspaceRuntimeDependencies = new Set(
  Object.keys(workspaceManifest.dependencies ?? {}),
)
const isWorkspaceRuntimeDependency = (id: string) =>
  [...workspaceRuntimeDependencies].some(
    (dependency) => id === dependency || id.startsWith(`${dependency}/`),
  )

export default defineConfig({
  oxc: {
    exclude: [/\.js$/, /\.d\.[cm]?ts$/],
  },
  resolve: {
    conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultClientConditions],
  },
  environments: {
    ssr: {
      resolve: {
        conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultServerConditions],
      },
    },
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(workspaceRoot, 'src/index.ts'),
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    minify: false,
    outDir: resolve(workspaceRoot, 'dist'),
    target: 'node24',
    rolldownOptions: {
      // Workspace packages target Node, not Vite's browser compatibility layer.
      platform: 'node',
      plugins: [
        dts({
          cwd: workspaceRoot,
          sourcemap: false,
          tsconfig: resolve(workspaceRoot, 'tsconfig.json'),
        }),
      ],
      external: (id) =>
        id.startsWith('node:') ||
        builtinModules.includes(id) ||
        isWorkspaceRuntimeDependency(id),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 60000,
    coverage: {
      enabled: true,
      reporter: ['json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.generated.ts'],
    },
  },
})
