import { builtinModules } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const packageJson = process.env.npm_package_json
if (!packageJson)
  throw new Error('npm_package_json is required to build a workspace')
const workspaceRoot = dirname(packageJson)
const packageName = process.env.npm_package_name
if (!packageName) throw new Error('npm_package_name is required')
const convertSemverModuleToEsm = (source: string) => {
  let importIndex = 0
  let converted = source.replace(/^['"]use strict['"];?\s*/u, '')
  converted = converted.replace(
    /const\s+(\{[\s\S]*?\}|[$\w]+)\s*=\s*require\((['"])([^'"]+)\2\)/gu,
    (_match, binding: string, _quote: string, specifier: string) => {
      const imported = `__commonJsImport${importIndex++}`
      return `import ${imported} from '${specifier}'\nconst ${binding} = ${imported}`
    },
  )
  if (converted.includes('exports = module.exports = {}')) {
    return `${converted
      .replace('exports = module.exports = {}', 'const __defaultExport = {}')
      .replaceAll(
        'exports.',
        '__defaultExport.',
      )}\nexport default __defaultExport\n`
  }
  converted = converted.replace('module.exports =', 'const __defaultExport =')
  return `${converted}\nexport default __defaultExport\n`
}
export default defineConfig({
  resolve: {
    alias:
      packageName === 'release-drafter'
        ? {
            '@release-drafter/core': resolve(
              workspaceRoot,
              '../core/src/index.ts',
            ),
          }
        : undefined,
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(workspaceRoot, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    minify: false,
    outDir: resolve(workspaceRoot, 'dist'),
    target: 'node24',
    rollupOptions: {
      // Workspace packages target Node, not Vite's browser compatibility layer.
      // @ts-expect-error remove this when Vite's rolldown platform option is stable
      platform: 'node',
      external: (id) => id.startsWith('node:') || builtinModules.includes(id),
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
        if (packageName !== 'release-drafter') return
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
        if (normalizedId.includes('/node_modules/semver/')) {
          return convertSemverModuleToEsm(source)
        }
      },
    },
    {
      name: 'workspace-declarations',
      async closeBundle() {
        if (packageName === 'release-drafter') return
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
