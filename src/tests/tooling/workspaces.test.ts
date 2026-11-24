import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
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
import { collectWorkflowFailures } from '#src/scripts/guard-packages.ts'
import { syncWorkspaceVersions } from '#src/scripts/sync-workspace-versions.ts'
import { publicPackageConfig } from '../../../packages/release-drafter/vite.config.ts'
import { createWorkspaceConfig } from '../../../vite.workspace.config.ts'

describe('workspace foundation', () => {
  it('loads the public package config from the repository root with package-local paths', () => {
    const root = resolve('packages/release-drafter')
    const manifest = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    )

    expect(publicPackageConfig.root).toBe(root)
    expect(publicPackageConfig.pack).toMatchObject({
      cwd: root,
      entry: {
        index: join(root, 'src/index.ts'),
        cli: join(root, 'src/cli.ts'),
      },
      outDir: join(root, 'dist'),
      tsconfig: join(root, 'tsconfig.build.json'),
      dts: { cwd: root, tsconfig: join(root, 'tsconfig.build.json') },
      define: { __RELEASE_DRAFTER_VERSION__: JSON.stringify(manifest.version) },
    })
  })

  it('keeps package entrypoints and runtime dependencies independent in the same process', () => {
    const core = createWorkspaceConfig(resolve('packages/core'))
    const actions = createWorkspaceConfig(resolve('packages/gh-actions'))

    expect(core.pack.entry).toEqual({
      index: resolve('packages/core/src/index.ts'),
    })
    expect(actions.pack.entry).toEqual({
      index: resolve('packages/gh-actions/src/index.ts'),
      'drafter/index': resolve('packages/gh-actions/src/drafter/index.ts'),
      'autolabeler/index': resolve(
        'packages/gh-actions/src/autolabeler/index.ts',
      ),
      'check-pr/index': resolve('packages/gh-actions/src/check-pr/index.ts'),
      config: resolve('packages/gh-actions/src/config.ts'),
    })
    expect(core.pack.inputOptions.external('zod')).toBe(true)
    expect(publicPackageConfig.pack.inputOptions.external('zod')).toBe(false)
    expect(core.pack.inputOptions.external('@gitbeaker/rest')).toBe(false)
    expect(
      publicPackageConfig.pack.inputOptions.external('@gitbeaker/rest'),
    ).toBe(true)
    expect(core.pack.define).toBeUndefined()
    expect(actions.pack.define).toBeUndefined()
  })

  it('preserves rebuilt package exports when notice generation hits the cache', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-drafter-build-cache-'))
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ name: 'build-cache-fixture', type: 'module' }),
      )
      // Exercise the real task graph and cache settings with lightweight
      // generators that have the same independent inputs and output locations.
      const tasks = Object.fromEntries(
        Object.entries(publicPackageConfig.run.tasks).map(([name, task]) => [
          name,
          {
            ...task,
            command: task.command
              .replace('vp pack', 'node build.mjs')
              .replace(
                'node ../../src/scripts/third-party-notices.ts',
                'node notices.mjs',
              ),
          },
        ]),
      )
      writeFileSync(
        join(root, 'vite.config.ts'),
        `export default ${JSON.stringify({ run: { tasks } })}`,
      )
      writeFileSync(
        join(root, 'build.mjs'),
        `import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.js', 'export default ' + readFileSync('version.json', 'utf8'))
`,
      )
      writeFileSync(
        join(root, 'notices.mjs'),
        `import { writeFileSync } from 'node:fs'
writeFileSync('THIRD_PARTY_NOTICES', 'fixture notices')
`,
      )
      const build = () =>
        execFileSync(resolve('node_modules/.bin/vp'), ['run', 'build'], {
          cwd: root,
          encoding: 'utf8',
        })
      const version = () =>
        execFileSync(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            "import version from './dist/index.js'; process.stdout.write(String(version))",
          ],
          { cwd: root, encoding: 'utf8' },
        )

      writeFileSync(join(root, 'version.json'), '1')
      build()
      expect(version()).toBe('1')

      writeFileSync(join(root, 'version.json'), '2')
      expect(build()).toMatch(/node notices\.mjs[^\n]*cache hit/u)
      expect(version()).toBe('2')
      expect(readFileSync(join(root, 'THIRD_PARTY_NOTICES'), 'utf8')).toBe(
        'fixture notices',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('regenerates missing Action manifests from authored templates', () => {
    const root = mkdtempSync(join(tmpdir(), 'action-metadata-'))
    try {
      cpSync(
        'src/scripts/action-metadata',
        join(root, 'src/scripts/action-metadata'),
        {
          recursive: true,
        },
      )
      for (const directory of ['drafter', 'autolabeler', 'check-pr']) {
        mkdirSync(join(root, directory))
      }
      execFileSync(
        process.execPath,
        [resolve('src/scripts/action-metadata.ts')],
        {
          cwd: root,
        },
      )
      for (const metadata of Object.values(actionManifests)) {
        for (const path of metadata.paths) {
          expect(parseYaml(readFileSync(join(root, path), 'utf8'))).toEqual(
            parseYaml(readFileSync(path, 'utf8')),
          )
        }
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
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
    const sourceDirectory = 'packages/gh-actions/src'
    const contractPath = join(sourceDirectory, 'common/action-contract.ts')
    const directAccess = /\bcore\.(?:getInput|setOutput)\s*\(/u
    const offenders = readdirSync(sourceDirectory, {
      recursive: true,
      encoding: 'utf8',
    })
      .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
      .map((path) => join(sourceDirectory, path))
      .filter(
        (path) =>
          path !== contractPath &&
          directAccess.test(readFileSync(path, 'utf8')),
      )

    expect(offenders).toEqual([])
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

  it('requires setup-vp to use repository pins without version overrides', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/vp.yml'),
        `
jobs:
  build:
    steps:
      - uses: voidzero-dev/setup-vp@pinned
        with:
          version-file: package.json
          node-version-file: .node-version
      - uses: voidzero-dev/setup-vp@pinned
        with:
          version-file: package.json
          node-version-file: .node-version
          node-version: '26'
      - uses: voidzero-dev/setup-vp@pinned
        with:
          node-version-file: .node-version
          version: latest
`,
      )
      expect(collectWorkflowFailures(fixtureRoot)).toEqual([
        'vp.yml setup-vp step build/2 must select Node through .node-version',
        'vp.yml setup-vp step build/3 must select Vite+ through package.json',
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
