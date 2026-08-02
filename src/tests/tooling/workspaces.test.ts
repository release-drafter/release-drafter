import { execFileSync } from 'node:child_process'
import {
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
import { collectRuntimeDependencyFailures } from '#src/scripts/guard-boundaries.ts'
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
      const scopeDirectory = join(fixtureRoot, 'node_modules/@release-drafter')
      mkdirSync(scopeDirectory, { recursive: true })
      symlinkSync(resolve('packages/core'), join(scopeDirectory, 'core'), 'dir')
      writeFileSync(
        join(fixtureRoot, 'index.ts'),
        "import '@release-drafter/core'\n",
      )
      writeFileSync(
        join(fixtureRoot, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            customConditions: ['release-drafter-source'],
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            noEmit: true,
            strict: true,
            types: [],
          },
          files: ['index.ts'],
        }),
      )

      const trace = execFileSync(
        process.execPath,
        [
          resolve('node_modules/typescript/lib/tsc.js'),
          '--project',
          join(fixtureRoot, 'tsconfig.json'),
          '--traceResolution',
        ],
        { encoding: 'utf8' },
      )
      expect(trace).toContain(resolve('packages/core/src/index.ts'))
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('preserves action compatibility metadata and tracked paths', () => {
    const rootAction = readFileSync('action.yml', 'utf8')
    const drafterAction = readFileSync('drafter/action.yml', 'utf8')
    const autolabelerAction = readFileSync('autolabeler/action.yml', 'utf8')
    expect(rootAction).toContain('using: node24')
    expect(rootAction).toContain('main: dist/actions/drafter/run.js')
    expect(drafterAction).toContain('using: node24')
    expect(drafterAction).toContain('main: ../dist/actions/drafter/run.js')
    expect(autolabelerAction).toContain('using: node24')
    expect(autolabelerAction).toContain(
      'main: ../dist/actions/autolabeler/run.js',
    )
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

  it('rejects runtime workspace imports satisfied only by devDependencies', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-boundaries-'),
    )
    const writeWorkspace = (params: {
      name: string
      directory: string
      devDependencies?: Record<string, string>
      source?: string
    }) => {
      const workspace = join(fixtureRoot, 'packages', params.directory)
      mkdirSync(join(workspace, 'src'), { recursive: true })
      writeFileSync(
        join(workspace, 'package.json'),
        JSON.stringify({
          name: params.name,
          devDependencies: params.devDependencies,
        }),
      )
      writeFileSync(join(workspace, 'src/index.ts'), params.source ?? '')
    }

    try {
      writeWorkspace({
        directory: 'github-adapter',
        name: '@release-drafter/github-adapter',
        devDependencies: { '@release-drafter/core': 'workspace:*' },
        source: "import '@release-drafter/core'",
      })
      writeWorkspace({
        directory: 'gitea-adapter',
        name: '@release-drafter/gitea-adapter',
        devDependencies: { '@release-drafter/core': 'workspace:*' },
        source: `
          import type { Core } from '@release-drafter/core'
          type CoreModule = import('@release-drafter/core').Core
        `,
      })

      expect(collectRuntimeDependencyFailures(fixtureRoot)).toEqual([
        expect.stringContaining(
          '@release-drafter/github-adapter imports private runtime dependency @release-drafter/core from devDependencies',
        ),
      ])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('uses dependency-cruiser with SWC for source, JavaScript, and declaration boundaries', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-dependency-cruiser-'),
    )
    const configPath = join(process.cwd(), '.dependency-cruiser.mjs')
    const dependencyCruiserCli = join(
      process.cwd(),
      'node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
    )
    const writeWorkspace = (params: {
      name: string
      directory: string
      dependencies?: Record<string, string>
      source?: string
      javascript?: string
      declaration?: string
    }) => {
      const workspace = join(fixtureRoot, 'packages', params.directory)
      mkdirSync(join(workspace, 'src'), { recursive: true })
      mkdirSync(join(workspace, 'dist'), { recursive: true })
      writeFileSync(
        join(workspace, 'package.json'),
        JSON.stringify({
          name: params.name,
          type: 'module',
          dependencies: params.dependencies,
          exports: {
            '.': {
              types: './dist/index.d.ts',
              import: './dist/index.js',
            },
          },
        }),
      )
      writeFileSync(join(workspace, 'src/index.ts'), params.source ?? '')
      writeFileSync(join(workspace, 'dist/index.js'), params.javascript ?? '')
      writeFileSync(
        join(workspace, 'dist/index.d.ts'),
        params.declaration ?? '',
      )

      const packageParts = params.name.split('/')
      const link = join(fixtureRoot, 'node_modules', ...packageParts)
      mkdirSync(join(link, '..'), { recursive: true })
      symlinkSync(
        workspace,
        link,
        process.platform === 'win32' ? 'junction' : 'dir',
      )
    }

    try {
      writeWorkspace({
        directory: 'core',
        name: '@release-drafter/core',
        source: "import '@release-drafter/rest-adapter'",
        javascript: "export * from '@release-drafter/github-adapter'",
      })
      writeWorkspace({
        directory: 'github-adapter',
        name: '@release-drafter/github-adapter',
      })
      writeWorkspace({
        directory: 'release-drafter',
        name: 'release-drafter',
        dependencies: { '@release-drafter/core': 'workspace:*' },
        declaration: "export * from '@release-drafter/core'",
      })
      writeWorkspace({
        directory: 'rest-adapter',
        name: '@release-drafter/rest-adapter',
      })

      let output = ''
      try {
        execFileSync(
          process.execPath,
          [dependencyCruiserCli, '--config', configPath, 'packages'],
          {
            cwd: fixtureRoot,
            encoding: 'utf8',
            stdio: 'pipe',
          },
        )
      } catch (error) {
        const failure = error as { stderr?: string; stdout?: string }
        output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
      }

      expect(output).toContain('workspace-source-dependencies-core')
      expect(output).toContain('workspace-output-dependencies-core')
      expect(output).toContain('public-facade-must-bundle-private-workspaces')
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
