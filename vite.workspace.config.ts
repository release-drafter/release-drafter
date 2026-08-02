import { builtinModules } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const packageJson = process.env.npm_package_json
if (!packageJson)
  throw new Error('npm_package_json is required to build a workspace')
const workspaceRoot = dirname(packageJson)
export default defineConfig({
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
      name: 'workspace-declarations',
      async closeBundle() {
        const packageName = process.env.npm_package_name
        if (!packageName) throw new Error('npm_package_name is required')
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
