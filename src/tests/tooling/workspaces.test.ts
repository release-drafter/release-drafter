import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import {
  actionInputNames as autolabelerInputNames,
  actionOutputNames as autolabelerOutputNames,
} from '#gh-actions/autolabeler/action-metadata.ts'
import {
  actionInputNames as checkPrInputNames,
  actionOutputNames as checkPrOutputNames,
} from '#gh-actions/check-pr/action-metadata.ts'
import {
  actionInputNames as drafterInputNames,
  actionOutputNames as drafterOutputNames,
} from '#gh-actions/drafter/action-metadata.ts'
import { actionManifests } from '#src/scripts/action-metadata-config.ts'
import {
  collectPackageFailures,
  collectWorkflowFailures,
} from '#src/scripts/guard-packages.ts'
import { syncWorkspaceVersions } from '#src/scripts/sync-workspace-versions.ts'

type PackageJson = {
  exports?: Record<
    string,
    {
      import?: string
      'release-drafter-source'?: string
      types?: Record<string, string>
    }
  >
  scripts?: Record<string, string>
}
const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as PackageJson

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })

describe('workspace foundation', () => {
  it('satisfies the workspace package guard', () => {
    expect(collectPackageFailures()).toEqual([])
  })

  it('keeps workspace package exports aligned', () => {
    const packages = readdirSync('packages').sort()
    for (const dir of packages) {
      const manifest = readJson(join('packages', dir, 'package.json'))
      expect(manifest.exports?.['.']).toEqual({
        types: {
          'release-drafter-source': './src/index.ts',
          default: './dist/index.d.ts',
        },
        'release-drafter-source': './src/index.ts',
        import: './dist/index.js',
      })
    }
  })

  it('resolves linked workspace packages through their source export', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workspace-resolution-'),
    )
    try {
      symlinkSync(resolve('node_modules'), join(fixtureRoot, 'node_modules'))
      writeFileSync(
        join(fixtureRoot, 'package.json'),
        JSON.stringify({ type: 'module' }),
      )
      writeFileSync(
        join(fixtureRoot, 'index.ts'),
        "import '@release-drafter/core'\n",
      )
      writeFileSync(
        join(fixtureRoot, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            allowImportingTsExtensions: true,
            customConditions: ['release-drafter-source'],
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            noEmit: true,
            strict: true,
            types: ['node'],
          },
          files: ['index.ts'],
        }),
      )

      const result = spawnSync(
        process.execPath,
        [
          resolve('node_modules/typescript/lib/tsc.js'),
          '--project',
          join(fixtureRoot, 'tsconfig.json'),
          '--traceResolution',
        ],
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      )
      if (result.status !== 0) {
        const diagnostics = `${result.stdout}\n${result.stderr}`
          .split('\n')
          .filter((line) => line.includes('error TS'))
          .join('\n')
        throw new Error(
          diagnostics ||
            `${result.error?.message ?? 'TypeScript resolution check failed'} (status ${String(result.status)}, signal ${String(result.signal)})`,
        )
      }
      expect(result.stdout).toContain(resolve('packages/core/src/index.ts'))
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('preserves action compatibility metadata', () => {
    const rootAction = parseYaml(readFileSync('action.yml', 'utf8'))
    const drafterAction = parseYaml(readFileSync('drafter/action.yml', 'utf8'))
    const autolabelerAction = parseYaml(
      readFileSync('autolabeler/action.yml', 'utf8'),
    )
    const checkPrAction = parseYaml(readFileSync('check-pr/action.yml', 'utf8'))
    const normalizeMain = (metadata: Record<string, unknown>) => ({
      ...metadata,
      runs: { ...(metadata.runs as object), main: '<normalized>' },
    })

    expect(normalizeMain(rootAction)).toEqual(normalizeMain(drafterAction))
    expect(rootAction.runs).toMatchObject({
      using: 'node24',
      main: 'dist/actions/drafter/run.js',
    })
    expect(drafterAction.runs).toMatchObject({
      using: 'node24',
      main: '../dist/actions/drafter/run.js',
    })
    expect(autolabelerAction.runs).toMatchObject({
      using: 'node24',
      main: '../dist/actions/autolabeler/run.js',
    })
    expect(checkPrAction.runs).toMatchObject({
      using: 'node24',
      main: '../dist/actions/check-pr/run.js',
    })
    expect(rootAction.inputs.from).toMatchObject({ required: false })
    expect(rootAction.inputs).toEqual(actionManifests.drafter.inputs)
    expect(rootAction.outputs).toEqual(actionManifests.drafter.outputs)
    expect(autolabelerAction.inputs).toEqual(actionManifests.autolabeler.inputs)
    expect(autolabelerAction.outputs).toEqual(
      actionManifests.autolabeler.outputs,
    )
    expect(checkPrAction.inputs).toEqual(actionManifests.checkPr.inputs)
    expect(checkPrAction.outputs).toEqual(actionManifests.checkPr.outputs)
    expect(Object.keys(rootAction.inputs).sort()).toEqual(
      [...drafterInputNames].sort(),
    )
    expect(Object.keys(rootAction.outputs).sort()).toEqual(
      [...drafterOutputNames].sort(),
    )
    expect(Object.keys(autolabelerAction.inputs).sort()).toEqual(
      [...autolabelerInputNames].sort(),
    )
    expect(Object.keys(autolabelerAction.outputs ?? {}).sort()).toEqual(
      [...autolabelerOutputNames].sort(),
    )
    expect(Object.keys(checkPrAction.inputs).sort()).toEqual(
      [...checkPrInputNames].sort(),
    )
    expect(Object.keys(checkPrAction.outputs ?? {}).sort()).toEqual(
      [...checkPrOutputNames].sort(),
    )
  })

  it('routes Action input and output access through metadata contracts', () => {
    const contractPath = resolve(
      'packages/gh-actions/src/common/action-contract.ts',
    )
    const directAccess = /\bcore\.(?:getInput|setOutput)\s*\(/gu
    const offenders = listFiles(resolve('packages/gh-actions/src'))
      .filter((path) => path.endsWith('.ts') && path !== contractPath)
      .flatMap((path) =>
        [...readFileSync(path, 'utf8').matchAll(directAccess)].map(
          ({ 0: call }) => `${path}:${call}`,
        ),
      )

    expect(offenders).toEqual([])
  })

  it('keeps gh-actions runtime exports and workspace artifacts split by product', () => {
    const manifest = readJson(
      'packages/gh-actions/package.json',
    ) as PackageJson & {
      exports: Record<string, { import: string; types: string }>
    }
    expect(Object.keys(manifest.exports)).toEqual([
      '.',
      './drafter',
      './autolabeler',
      './check-pr',
      './config',
    ])
    expect(manifest.exports['./drafter'].import).toBe('./dist/drafter/index.js')
    expect(manifest.exports['./autolabeler'].import).toBe(
      './dist/autolabeler/index.js',
    )
    expect(manifest.exports['./check-pr'].import).toBe(
      './dist/check-pr/index.js',
    )
    const identitySource = readFileSync(
      'packages/gh-actions/src/index.ts',
      'utf8',
    )
    expect(identitySource).not.toContain("from './drafter/")
    expect(identitySource).not.toContain("from './autolabeler/")
    expect(identitySource).not.toContain("from './check-pr/")
    const workspaceBuild = readFileSync('vite.workspace.config.ts', 'utf8')
    expect(workspaceBuild).toContain("'drafter/index'")
    expect(workspaceBuild).toContain("'autolabeler/index'")
    expect(workspaceBuild).toContain("'check-pr/index'")
  })

  it('keeps TypeScript scripts directly parseable by Node without compilation', () => {
    const scripts = readdirSync('src/scripts')
      .filter((path) => path.endsWith('.ts'))
      .sort()
    expect(scripts.length).toBeGreaterThan(0)

    for (const script of scripts) {
      execFileSync(process.execPath, ['--check', join('src/scripts', script)], {
        encoding: 'utf8',
        stdio: 'pipe',
      })
    }
  })

  it('builds workspace dependencies before generating schemas', () => {
    const scripts = readJson('package.json').scripts

    expect(scripts?.ci).toContain('npm run generate:action-metadata')
    expect(scripts?.['generate:schemas']).toBe(
      'npm run build:workspaces && node src/scripts/json-schema.ts',
    )
    expect(scripts?.ci).toContain('npm run generate:schemas')
    expect(scripts?.ci).not.toContain('npm run build:workspaces')
  })
  it('rejects npm publication from .yaml workflows', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/publish.yaml'),
        'name: publish\nsteps:\n  - run: npm --workspace release-drafter publish\n',
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([
        'publish.yaml must not enable npm publication',
      ])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('allows npm publication only from the dedicated workflow', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/npm-publish.yml'),
        'name: publish\njobs:\n  publish:\n    steps:\n      - run: npm publish\n',
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('requires every setup-node step to use the repository Node version', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/node.yaml'),
        `
          jobs:
            build:
              steps:
                - uses: actions/setup-node@v6
                  with:
                    node-version-file: .node-version
                - uses: actions/setup-node@v6
        `,
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([
        'node.yaml setup-node step build/2 must select Node through .node-version',
      ])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('checks production dependencies with Knip while allowing type imports and bundled workspaces', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'release-drafter-knip-'))
    const script =
      readJson('package.json').scripts?.['check:dependencies:production']
    const writeWorkspace = (directory: string, source: string) => {
      const workspace = join(fixtureRoot, 'packages', directory)
      mkdirSync(join(workspace, 'src'), { recursive: true })
      writeFileSync(
        join(workspace, 'package.json'),
        JSON.stringify({
          name:
            directory === 'release-drafter'
              ? directory
              : `@release-drafter/${directory}`,
          type: 'module',
          exports: './src/index.ts',
          devDependencies:
            directory === 'core' ? {} : { '@release-drafter/core': '*' },
        }),
      )
      writeFileSync(join(workspace, 'src/index.ts'), source)
    }
    const runKnip = () =>
      spawnSync(
        process.execPath,
        [
          process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js',
          '--silent',
          'run',
          'check:dependencies:production',
          '--',
          '--reporter',
          'json',
        ],
        {
          cwd: fixtureRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${resolve('node_modules/.bin')}:${process.env.PATH}`,
          },
        },
      )

    try {
      writeFileSync(
        join(fixtureRoot, 'package.json'),
        JSON.stringify({
          private: true,
          workspaces: ['packages/*'],
          scripts: { 'check:dependencies:production': script },
        }),
      )
      copyFileSync('knip.jsonc', join(fixtureRoot, 'knip.jsonc'))
      writeWorkspace(
        'core',
        'export type Core = string\nexport const value = 1\n',
      )
      writeWorkspace(
        'github-adapter',
        "import { value } from '@release-drafter/core'\nexport const result = value\n",
      )
      writeWorkspace(
        'gitea-adapter',
        "import type { Core } from '@release-drafter/core'\nexport const value: Core = 'ok'\n",
      )
      writeWorkspace(
        'release-drafter',
        "export { value } from '@release-drafter/core'\n",
      )

      const invalid = runKnip()
      expect(invalid.status, invalid.stderr).toBe(1)
      expect(JSON.parse(invalid.stdout).issues).toEqual([
        expect.objectContaining({
          file: 'packages/github-adapter/src/index.ts',
          unlisted: [
            expect.objectContaining({ name: '@release-drafter/core' }),
          ],
        }),
      ])

      const manifestPath = join(
        fixtureRoot,
        'packages/github-adapter/package.json',
      )
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.dependencies = manifest.devDependencies
      delete manifest.devDependencies
      writeFileSync(manifestPath, JSON.stringify(manifest))
      const valid = runKnip()
      expect(valid.status, `${valid.stdout}\n${valid.stderr}`).toBe(0)
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('synchronizes every workspace manifest to the root version', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'release-drafter-versions-'))
    try {
      writeFileSync(
        join(fixtureRoot, 'package.json'),
        JSON.stringify({ name: '@release-drafter/root', version: '8.1.0' }),
      )
      for (const directory of ['core', 'release-drafter']) {
        const workspace = join(fixtureRoot, 'packages', directory)
        mkdirSync(workspace, { recursive: true })
        writeFileSync(
          join(workspace, 'package.json'),
          JSON.stringify({ name: directory, version: '0.0.1' }),
        )
      }

      expect(syncWorkspaceVersions(fixtureRoot)).toBe('8.1.0')
      for (const directory of ['core', 'release-drafter']) {
        expect(
          JSON.parse(
            readFileSync(
              join(fixtureRoot, 'packages', directory, 'package.json'),
              'utf8',
            ),
          ),
        ).toMatchObject({ version: '8.1.0' })
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })
})
