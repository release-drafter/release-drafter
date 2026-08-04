import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { builtinModules } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const packageJson = process.env.npm_package_json
if (!packageJson)
  throw new Error('npm_package_json is required to build a workspace')
const workspaceRoot = dirname(packageJson)
const workspaceManifest = JSON.parse(readFileSync(packageJson, 'utf8')) as {
  version?: unknown
  dependencies?: Record<string, unknown>
}
const workspaceVersion = workspaceManifest.version
if (typeof workspaceVersion !== 'string')
  throw new Error('workspace package version is required')
const packageName = process.env.npm_package_name
if (!packageName) throw new Error('npm_package_name is required')
const bundlesCliRuntime =
  packageName === 'release-drafter' || packageName === '@release-drafter/cli'
const bundlesGitHubActions = packageName === '@release-drafter/gh-actions'
const declarationPackages = new Set([
  '@release-drafter/core',
  '@release-drafter/rest-adapter',
  '@release-drafter/gitea-adapter',
  '@release-drafter/forgejo-adapter',
  '@release-drafter/gitlab-adapter',
])
const publicFacadeRuntimeDependencies = new Set(
  Object.keys(workspaceManifest.dependencies ?? {}),
)
const adapterWorkspaceAliases =
  packageName === '@release-drafter/rest-adapter'
    ? {
        '@release-drafter/core': resolve(workspaceRoot, '../core/src/index.ts'),
      }
    : packageName === '@release-drafter/gitea-adapter' ||
        packageName === '@release-drafter/forgejo-adapter' ||
        packageName === '@release-drafter/gitlab-adapter'
      ? {
          '@release-drafter/core': resolve(
            workspaceRoot,
            '../core/src/index.ts',
          ),
          '@release-drafter/rest-adapter': resolve(
            workspaceRoot,
            '../rest-adapter/src/index.ts',
          ),
        }
      : undefined
const workspaceAliases = bundlesCliRuntime
  ? {
      '@release-drafter/core': resolve(workspaceRoot, '../core/src/index.ts'),
      '@release-drafter/github-adapter': resolve(
        workspaceRoot,
        '../github-adapter/src/index.ts',
      ),
      yaml: resolve(workspaceRoot, '../../node_modules/yaml/dist/index.js'),
      ...(packageName === 'release-drafter'
        ? {
            '@release-drafter/cli': resolve(
              workspaceRoot,
              '../cli/src/index.ts',
            ),
          }
        : {}),
    }
  : adapterWorkspaceAliases

export default defineConfig({
  define:
    packageName === 'release-drafter'
      ? {
          __RELEASE_DRAFTER_VERSION__: JSON.stringify(workspaceVersion),
        }
      : undefined,
  resolve: {
    alias: workspaceAliases,
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry:
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
                'check-pr-title/index': resolve(
                  workspaceRoot,
                  'src/check-pr-title/index.ts',
                ),
                config: resolve(workspaceRoot, 'src/config.ts'),
              }
            : resolve(workspaceRoot, 'src/index.ts'),
      formats: ['es'],
      fileName:
        packageName === 'release-drafter'
          ? (_format, entryName) => `${entryName}.js`
          : bundlesGitHubActions
            ? (_format, entryName) => `${entryName}.js`
            : 'index',
    },
    minify: false,
    outDir: resolve(workspaceRoot, 'dist'),
    target: 'node24',
    rollupOptions: {
      // Workspace packages target Node, not Vite's browser compatibility layer.
      // @ts-expect-error remove this when Vite's rolldown platform option is stable
      platform: 'node',
      external: (id) =>
        id.startsWith('node:') ||
        builtinModules.includes(id) ||
        (packageName === 'release-drafter' &&
          publicFacadeRuntimeDependencies.has(id)),
      output:
        packageName === 'release-drafter'
          ? {
              chunkFileNames: 'chunks/[name]-[hash].js',
              codeSplitting: true,
              comments: false,
            }
          : undefined,
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
  plugins: [
    {
      name: 'release-drafter-commonjs-to-esm',
      enforce: 'pre',
      transform(source, id) {
        if (!bundlesCliRuntime) return
        const normalizedId = id.replaceAll('\\', '/')
        if (normalizedId.endsWith('/node_modules/ignore/index.js')) {
          return `${source
            .replace('module.exports = factory', '')
            .replaceAll('module.exports.', 'factory.')
            .replaceAll(
              'define(module.exports,',
              'define(factory,',
            )}\nexport default factory\n`
        }
        if (normalizedId.endsWith('/node_modules/regex-parser/lib/index.js')) {
          return `${source.replace(
            'var RegexParser = module.exports = function',
            'var RegexParser = function',
          )}\nexport default RegexParser\n`
        }
      },
    },
    {
      name: 'workspace-declarations',
      async closeBundle() {
        if (packageName === 'release-drafter') {
          const { chmod } = await import('node:fs/promises')
          await chmod(resolve(workspaceRoot, 'dist/cli.js'), 0o755)
          return
        }
        if (declarationPackages.has(packageName)) {
          const repositoryRoot = resolve(workspaceRoot, '../..')
          const temporaryOutDir = mkdtempSync(
            join(tmpdir(), 'release-drafter-declarations-'),
          )
          try {
            execFileSync(
              process.execPath,
              [
                resolve(repositoryRoot, 'node_modules/typescript/lib/tsc.js'),
                '-p',
                resolve(workspaceRoot, 'tsconfig.json'),
                '--declaration',
                '--emitDeclarationOnly',
                '--noEmit',
                'false',
                '--declarationMap',
                'false',
                '--rootDir',
                repositoryRoot,
                '--outDir',
                temporaryOutDir,
              ],
              { cwd: repositoryRoot, stdio: 'pipe' },
            )
            const packageDirectory = packageName.replace(
              '@release-drafter/',
              '',
            )
            const declarationSource = join(
              temporaryOutDir,
              'packages',
              packageDirectory,
              'src',
            )
            const copyDeclarations = (
              sourceDirectory: string,
              targetDirectory: string,
            ) => {
              mkdirSync(targetDirectory, { recursive: true })
              for (const entry of readdirSync(sourceDirectory, {
                withFileTypes: true,
              })) {
                const source = join(sourceDirectory, entry.name)
                const target = join(targetDirectory, entry.name)
                if (entry.isDirectory()) {
                  copyDeclarations(source, target)
                  continue
                }
                if (
                  !entry.name.endsWith('.d.ts') ||
                  entry.name.endsWith('.test.d.ts')
                ) {
                  continue
                }
                const declaration = readFileSync(source, 'utf8').replace(
                  /(['"])(\.[^'"]+)\.ts\1/g,
                  (_match, quote: string, specifier: string) =>
                    `${quote}${specifier}.js${quote}`,
                )
                writeFileSync(target, declaration)
              }
            }
            copyDeclarations(declarationSource, resolve(workspaceRoot, 'dist'))
          } finally {
            rmSync(temporaryOutDir, { force: true, recursive: true })
          }
          return
        }
        const constantName = `${packageName
          .replace('@release-drafter/', '')
          .replaceAll('-', '_')
          .toUpperCase()}_PACKAGE_NAME`
        const declaration = `/** Package identity used while the ${packageName} boundary is established. */\nexport declare const ${constantName}: "${packageName}";\n`
        const { writeFile } = await import('node:fs/promises')
        await writeFile(resolve(workspaceRoot, 'dist/index.d.ts'), declaration)
      },
    },
  ],
})
