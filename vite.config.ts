import { execFile } from 'node:child_process'
import { chmod, readdir, readFile, writeFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import { defineConfig, type Plugin } from 'vitest/config'

const FROM = 'main: dist/actions/drafter/run.js'
const TO = 'main: ../dist/actions/drafter/run.js'
const execFileAsync = promisify(execFile)

function syncDrafterActionYml(): Plugin {
  return {
    name: 'sync-drafter-action-yml',
    applyToEnvironment: (environment) => environment.name === 'actions',
    async closeBundle() {
      const [src, dest] = await Promise.all([
        readFile('action.yml', 'utf8'),
        readFile('drafter/action.yml', 'utf8'),
      ])
      const expected = src.includes(FROM) ? src.replace(FROM, TO) : src
      if (dest !== expected) {
        await writeFile('drafter/action.yml', expected)
      }
      await chmod('dist/cli.js', 0o755)
    },
  }
}

function assertPublicBundles(): Plugin {
  return {
    name: 'assert-public-bundles',
    applyToEnvironment: (environment) => environment.name === 'client',
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue

        const actionModule = output.moduleIds.find((id) =>
          id.includes('/node_modules/@actions/'),
        )
        if (actionModule) {
          this.error(
            `Public bundle ${output.fileName} contains an Actions runtime module: ${actionModule}`,
          )
        }

        for (const value of ['createRequire', '__require']) {
          if (output.code.includes(value)) {
            this.error(
              `Public bundle ${output.fileName} contains forbidden CommonJS runtime code: ${value}`,
            )
          }
        }
      }
    },
  }
}

const emitDeclarations = async () => {
  await execFileAsync(process.execPath, [
    path.resolve('node_modules/typescript/bin/tsc'),
    '-p',
    'tsconfig.types.json',
  ])

  const declarationRoot = path.resolve('dist/types')
  const declarationFiles = (await readdir(declarationRoot, { recursive: true }))
    .filter((file) => file.endsWith('.d.ts'))
    .map((file) => path.join(declarationRoot, file))
  const importSpecifier = /(['"])(#src\/[^'"]+|\.{1,2}\/[^'"]+)\.ts\1/g

  for (const file of declarationFiles) {
    const declaration = await readFile(file, 'utf8')
    const rewritten = declaration.replace(
      importSpecifier,
      (_, quote: string, specifier: string) => {
        if (!specifier.startsWith('#src/')) {
          return `${quote}${specifier}.js${quote}`
        }

        const target = path.join(
          declarationRoot,
          specifier.slice('#src/'.length),
        )
        let relative = path.relative(path.dirname(file), target)
        if (!relative.startsWith('.')) relative = `./${relative}`

        return `${quote}${relative.split(path.sep).join('/')}.js${quote}`
      },
    )

    if (/(['"])(?:#src\/|\.{1,2}\/)[^'"]+\.ts\1/.test(rewritten)) {
      throw new Error(`Failed to rewrite declaration imports in ${file}`)
    }

    await writeFile(file, rewritten)
  }
}

const build = (actionBuild: boolean) => ({
  emptyOutDir: !actionBuild,
  modulePreload: false,
  target: 'node24',
  rollupOptions: {
    // Keep exports from programmatic entries while still sharing their chunks.
    preserveEntrySignatures: 'exports-only',
    // All entry points run on Node.js and must resolve package exports through
    // their Node variants. The action build additionally contains CommonJS
    // transitive dependencies from the Actions runtime, while public CLI and
    // library bundles remain native ESM.
    // @ts-expect-error remove this when Vite support for Rolldown is stable
    platform: 'node',
    // Resolve Consola at runtime so Node selects its terminal reporter instead
    // of Vite's client conditions selecting its browser reporter.
    external: (id: string) =>
      id.startsWith('node:') ||
      builtinModules.includes(id) ||
      (!actionBuild && id === 'consola'),
    input: actionBuild
      ? {
          'actions/drafter/run': 'src/actions/drafter/run.ts',
          'actions/autolabeler/run': 'src/actions/autolabeler/run.ts',
        }
      : {
          cli: 'src/cli/run.ts',
          drafter: 'src/drafter.ts',
        },
    output: {
      format: 'es' as const,
      entryFileNames: '[name].js',
      chunkFileNames: actionBuild
        ? 'chunks/actions/[name].js'
        : 'chunks/public/[name].js',
      paths: (id: string) => (builtinModules.includes(id) ? `node:${id}` : id),
    },
  },
  minify: false,
})

export default defineConfig({
  plugins: [syncDrafterActionYml(), assertPublicBundles()],
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.client)
      await builder.build(builder.environments.actions)
      await emitDeclarations()
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  environments: {
    client: {
      keepProcessEnv: true,
      build: build(false),
    },
    actions: {
      keepProcessEnv: true,
      resolve: {
        noExternal: true,
      },
      build: build(true),
    },
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
        'src/**/*.generated.ts',
      ],
    },
  },
})
