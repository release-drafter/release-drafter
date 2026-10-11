import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
  type ViteUserConfig,
} from 'vite-plus'

const WORKSPACE_SOURCE_CONDITION = 'release-drafter-source'
const workspaceRoot = process.cwd()
const workspaceManifest = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'package.json'), 'utf8'),
) as {
  name?: unknown
  version?: unknown
  dependencies?: Record<string, unknown>
}
const workspaceVersion = workspaceManifest.version
if (typeof workspaceVersion !== 'string')
  throw new Error('workspace package version is required')
const packageName = workspaceManifest.name
if (typeof packageName !== 'string')
  throw new Error('workspace package name is required')
const bundlesGitHubActions = packageName === '@release-drafter/gh-actions'
const workspaceRuntimeDependencies = new Set(
  Object.keys(workspaceManifest.dependencies ?? {}),
)
const isWorkspaceRuntimeDependency = (id: string) =>
  [...workspaceRuntimeDependencies].some(
    (dependency) => id === dependency || id.startsWith(`${dependency}/`),
  )
const declarationEntries =
  packageName === 'release-drafter' ? ['src/index.ts'] : undefined

const entries: Record<string, string> =
  packageName === 'release-drafter'
    ? {
        index: resolve(workspaceRoot, 'src/index.ts'),
        cli: resolve(workspaceRoot, 'src/cli.ts'),
      }
    : bundlesGitHubActions
      ? {
          index: resolve(workspaceRoot, 'src/index.ts'),
          'drafter/index': resolve(workspaceRoot, 'src/drafter/index.ts'),
          'autolabeler/index': resolve(
            workspaceRoot,
            'src/autolabeler/index.ts',
          ),
          'check-pr/index': resolve(workspaceRoot, 'src/check-pr/index.ts'),
          config: resolve(workspaceRoot, 'src/config.ts'),
        }
      : { index: resolve(workspaceRoot, 'src/index.ts') }

export const workspaceConfig = {
  run: {
    tasks: {
      build: {
        command: 'vp pack',
        cache: {
          input: [
            { auto: true },
            '!dist',
            '!dist/**',
            '!THIRD_PARTY_NOTICES',
            { pattern: '!node_modules/.vite-temp/**', base: 'workspace' },
          ],
          output: ['dist/**'],
        },
      },
    },
  },
  pack: {
    cwd: workspaceRoot,
    entry: entries,
    define:
      packageName === 'release-drafter'
        ? { __RELEASE_DRAFTER_VERSION__: JSON.stringify(workspaceVersion) }
        : undefined,
    format: ['esm'],
    platform: 'node',
    target: 'node24',
    clean: true,
    minify: false,
    sourcemap: false,
    outDir: resolve(workspaceRoot, 'dist'),
    tsconfig: resolve(workspaceRoot, 'tsconfig.build.json'),
    dts: {
      cwd: workspaceRoot,
      tsconfig: resolve(workspaceRoot, 'tsconfig.build.json'),
      entry: declarationEntries,
      sourcemap: false,
    },
    inputOptions: {
      resolve: {
        conditionNames: [
          WORKSPACE_SOURCE_CONDITION,
          'node',
          'import',
          'default',
        ],
      },
      external: (id) =>
        id.startsWith('node:') ||
        builtinModules.includes(id) ||
        isWorkspaceRuntimeDependency(id),
    },
    outputOptions: {
      entryFileNames: '[name].js',
      ...(packageName === 'release-drafter'
        ? {
            chunkFileNames: 'chunks/[name]-[hash].js',
            codeSplitting: true,
            comments: false,
          }
        : {}),
    },
    hooks: {
      'build:done': async () => {
        if (packageName === 'release-drafter') {
          const { chmod } = await import('node:fs/promises')
          await chmod(resolve(workspaceRoot, 'dist/cli.js'), 0o755)
        }
      },
    },
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
} satisfies ViteUserConfig

export default defineConfig(workspaceConfig)
