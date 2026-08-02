import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectBoundaryFailures } from '#src/scripts/guard-boundaries.ts'
import { collectWorkflowFailures } from '#src/scripts/guard-packages.ts'
import { syncWorkspaceVersions } from '#src/scripts/sync-workspace-versions.ts'

type PackageJson = {
  name: string
  version?: string
  private?: boolean
  engines?: { node?: string }
  exports?: unknown
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
        /npm\s+(publish|token)|registry-url|NODE_AUTH_TOKEN/,
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
        'name: publish\nsteps:\n  - run: npm publish\n',
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([
        'publish.yaml must not enable npm publication',
      ])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('rejects undeclared source imports and private imports left in public output', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-boundaries-'),
    )
    const writeWorkspace = (params: {
      name: string
      directory: string
      dependencies?: Record<string, string>
      source?: string
      output?: string
    }) => {
      const workspace = join(fixtureRoot, 'packages', params.directory)
      mkdirSync(join(workspace, 'src'), { recursive: true })
      mkdirSync(join(workspace, 'dist'), { recursive: true })
      writeFileSync(
        join(workspace, 'package.json'),
        JSON.stringify({
          name: params.name,
          dependencies: params.dependencies,
        }),
      )
      writeFileSync(join(workspace, 'src/index.ts'), params.source ?? '')
      writeFileSync(join(workspace, 'dist/index.js'), params.output ?? '')
    }

    try {
      writeWorkspace({
        directory: 'core',
        name: '@release-drafter/core',
        source: "import '@release-drafter/rest-adapter'",
        output: "export * from '@release-drafter/github-adapter'",
      })
      writeWorkspace({
        directory: 'github-adapter',
        name: '@release-drafter/github-adapter',
        dependencies: { '@release-drafter/core': 'workspace:*' },
        source: "import type {} from '@release-drafter/core'",
      })
      writeWorkspace({
        directory: 'release-drafter',
        name: 'release-drafter',
        dependencies: { '@release-drafter/core': 'workspace:*' },
        source: "export * from '@release-drafter/core'",
        output: "export * from '@release-drafter/core'",
      })

      expect(collectBoundaryFailures(fixtureRoot)).toEqual([
        expect.stringContaining(
          '@release-drafter/core imports undeclared private runtime dependency @release-drafter/rest-adapter',
        ),
        expect.stringContaining(
          '@release-drafter/core output imports undeclared private runtime dependency @release-drafter/github-adapter',
        ),
        expect.stringContaining(
          'public facade output contains unresolved private import @release-drafter/core',
        ),
      ])
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
