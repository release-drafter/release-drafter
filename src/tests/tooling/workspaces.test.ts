import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { collectRuntimeDependencyFailures } from '#src/scripts/guard-boundaries.ts'
import { collectWorkflowFailures } from '#src/scripts/guard-packages.ts'
import { syncWorkspaceVersions } from '#src/scripts/sync-workspace-versions.ts'

type PackageJson = {
  name: string
  version?: string
  private?: boolean
  engines?: { node?: string }
  exports?: unknown
  scripts?: Record<string, string>
}
const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as PackageJson

describe('workspace foundation', () => {
  it('keeps root private and delegates package publication to only the facade skeleton', () => {
    const root = readJson('package.json') as PackageJson & {
      workspaces: string[]
    }
    expect(root.name).not.toBe('release-drafter')
    expect(root.private).toBe(true)
    expect(root.workspaces).toEqual(['packages/*'])
    expect(root.engines?.node).toBe('>=24.0.0')
    const packages = readdirSync('packages').sort()
    expect(packages).toEqual([
      'autolabeler',
      'cli',
      'core',
      'forgejo-adapter',
      'gh-actions',
      'gitea-adapter',
      'github-adapter',
      'gitlab-adapter',
      'release-drafter',
      'rest-adapter',
    ])
    for (const dir of packages) {
      const manifest = readJson(join('packages', dir, 'package.json'))
      expect(manifest.engines?.node).toBe('>=24.0.0')
      expect(manifest.version).toBe(root.version)
      expect(manifest.exports).toBeDefined()
      if (dir === 'release-drafter') {
        expect(manifest.name).toBe('release-drafter')
        expect(manifest.private).not.toBe(true)
      } else {
        expect(manifest.name).toBe(`@release-drafter/${dir}`)
        expect(manifest.private).toBe(true)
      }
    }
  })

  it('preserves action compatibility metadata and tracked paths', () => {
    const rootAction = parseYaml(readFileSync('action.yml', 'utf8'))
    const drafterAction = parseYaml(readFileSync('drafter/action.yml', 'utf8'))
    const autolabelerAction = parseYaml(
      readFileSync('autolabeler/action.yml', 'utf8'),
    )
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
    expect(rootAction.inputs.from).toMatchObject({ required: false })
    expect(Object.keys(rootAction.inputs).sort()).toEqual(
      [
        'commitish',
        'config-name',
        'dry-run',
        'filter-by-range',
        'footer',
        'from',
        'header',
        'include-pre-releases',
        'latest',
        'name',
        'prerelease',
        'prerelease-identifier',
        'publish',
        'tag',
        'token',
        'version',
      ].sort(),
    )
    expect(Object.keys(rootAction.outputs).sort()).toEqual(
      [
        'body',
        'html_url',
        'id',
        'major_version',
        'minor_version',
        'name',
        'patch_version',
        'resolved_version',
        'tag_name',
        'upload_url',
      ].sort(),
    )
    expect(Object.keys(autolabelerAction.inputs).sort()).toEqual([
      'config-name',
      'dry-run',
      'token',
    ])
    expect(autolabelerAction.outputs ?? {}).toEqual({})

    for (const artifact of [
      'dist/actions/drafter/run.js',
      'dist/actions/autolabeler/run.js',
    ]) {
      expect(statSync(artifact).isFile()).toBe(true)
      expect(statSync(artifact).size).toBeGreaterThan(0)
    }
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
      './config',
    ])
    expect(manifest.exports['./drafter'].import).toBe('./dist/drafter/index.js')
    expect(manifest.exports['./autolabeler'].import).toBe(
      './dist/autolabeler/index.js',
    )
    const identitySource = readFileSync(
      'packages/gh-actions/src/index.ts',
      'utf8',
    )
    expect(identitySource).not.toContain("from './drafter/")
    expect(identitySource).not.toContain("from './autolabeler/")
    const workspaceBuild = readFileSync('vite.workspace.config.ts', 'utf8')
    expect(workspaceBuild).toContain("'drafter/index'")
    expect(workspaceBuild).toContain("'autolabeler/index'")
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

    expect(scripts?.schemas).toBe(
      'npm run build:workspaces && node src/scripts/json-schema.ts',
    )
    expect(scripts?.all).toContain('npm run schemas')
    expect(scripts?.all).not.toContain('npm run build:workspaces')
  })

  it('keeps CI on Node 24 without enabling npm publication', () => {
    expect(readFileSync('.node-version', 'utf8').trim()).toMatch(/^24\./)
    for (const workflow of readdirSync('.github/workflows').filter(
      (path) => path.endsWith('.yml') || path.endsWith('.yaml'),
    )) {
      const contents = readFileSync(join('.github/workflows', workflow), 'utf8')
      if (contents.includes('actions/setup-node@')) {
        expect(contents).toContain('node-version-file: .node-version')
      }
      expect(contents).not.toMatch(
        /\bnpm(?:[ \t]+(?!publish\b|token\b)[^\s#]+)*[ \t]+(?:publish|token)\b|registry-url|NODE_AUTH_TOKEN/,
      )
    }
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
      writeWorkspace({
        directory: 'release-drafter',
        name: 'release-drafter',
        devDependencies: { '@release-drafter/core': 'workspace:*' },
        source: "import '@release-drafter/core'",
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
        directory: 'gh-actions',
        name: '@release-drafter/gh-actions',
        dependencies: { 'release-drafter': 'workspace:*' },
        source: "import 'release-drafter'",
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
      expect(output).toContain('gh-actions-must-not-use-public-facades')
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
