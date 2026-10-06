import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  emitForgeConformanceDecision,
  FORGE_CONFORMANCE_PATHSPECS,
  type ForgeConformanceEnvironment,
  type GitRunner,
  routeForgeConformance,
} from '../../scripts/forge-conformance-router.ts'

const baseEnvironment: ForgeConformanceEnvironment = {
  EVENT_NAME: 'pull_request',
  EVENT_ACTION: 'synchronize',
  LABEL_NAME: '',
  OVERRIDE_LABEL: 'ci:forge-conformance',
  HAS_OVERRIDE_LABEL: 'false',
  PR_BASE_SHA: 'abc123',
  PUSH_BEFORE_SHA: '',
}

const result = (
  status: number | null,
  error?: Error,
): ReturnType<GitRunner> => ({
  status,
  stdout: '',
  ...(error ? { error } : {}),
})

const gitRunner = (...statuses: Array<number | null>) => {
  const run = vi.fn<GitRunner>()
  for (const status of statuses) run.mockReturnValueOnce(result(status))
  return run
}

describe('forge conformance router', () => {
  it.each([
    ['pull request relevant diff', baseEnvironment, [0, 1], true],
    ['pull request irrelevant diff', baseEnvironment, [0, 0, 0], false],
    [
      'push relevant diff',
      {
        ...baseEnvironment,
        EVENT_NAME: 'push',
        PR_BASE_SHA: '',
        PUSH_BEFORE_SHA: 'def456',
      },
      [0, 1],
      true,
    ],
    [
      'push irrelevant diff',
      {
        ...baseEnvironment,
        EVENT_NAME: 'push',
        PR_BASE_SHA: '',
        PUSH_BEFORE_SHA: 'def456',
      },
      [0, 0, 0],
      false,
    ],
  ])('routes a %s', (_name, environment, statuses, shouldRun) => {
    expect(
      routeForgeConformance(environment, gitRunner(...statuses)),
    ).toMatchObject({ shouldRun })
  })

  it('runs only for the exact override label on labeled events', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        {
          ...baseEnvironment,
          EVENT_ACTION: 'labeled',
          LABEL_NAME: 'ci:forge-conformance',
        },
        runGit,
      ),
    ).toEqual({
      shouldRun: true,
      reason: 'override label ci:forge-conformance was added',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it.each([
    ['relevant diff', 1, true],
    ['irrelevant diff', 0, false],
  ])(
    'routes an unrelated labeled event using its %s',
    (_name, diffStatus, shouldRun) => {
      const runGit = gitRunner(0, diffStatus, 0)

      expect(
        routeForgeConformance(
          {
            ...baseEnvironment,
            EVENT_ACTION: 'labeled',
            LABEL_NAME: 'documentation',
          },
          runGit,
        ),
      ).toMatchObject({ shouldRun })
      expect(runGit).toHaveBeenCalledTimes(diffStatus === 0 ? 3 : 2)
    },
  )

  it.each([
    ['ci/gitlab-warm-start', ['gitlab']],
    ['ci/Gitea-Forgejo-merge-base', ['gitea', 'forgejo']],
  ])('runs only the forges named by a %s push', (branch, forges) => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        {
          ...baseEnvironment,
          EVENT_NAME: 'push',
          PR_BASE_SHA: '',
          PUSH_BEFORE_SHA: 'def456',
          REF_NAME: branch,
        },
        runGit,
      ),
    ).toEqual({
      shouldRun: true,
      reason: `branch ${branch} targets ${forges.join(', ')}`,
      forges,
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('skips ci branch pushes that do not name a forge', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        {
          ...baseEnvironment,
          EVENT_NAME: 'push',
          PR_BASE_SHA: '',
          PUSH_BEFORE_SHA: 'def456',
          REF_NAME: 'ci/actionlint-annotations',
        },
        runGit,
      ),
    ).toEqual({
      shouldRun: false,
      reason:
        'branch ci/actionlint-annotations does not name a conformance forge',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('routes pull requests from ci branches by changed files', () => {
    expect(
      routeForgeConformance(
        { ...baseEnvironment, REF_NAME: 'ci/gitlab-warm-start' },
        gitRunner(0, 0, 0),
      ),
    ).toEqual({
      shouldRun: false,
      reason: 'no relevant files or dependencies changed',
    })
  })

  it('emits selected forges for targeted branches', () => {
    const appendFileSync = vi.fn()

    emitForgeConformanceDecision(
      { shouldRun: true, reason: 'targeted', forges: ['gitlab'] },
      '/tmp/github-output',
      { appendFileSync, log: vi.fn(), warn: vi.fn() },
    )

    expect(appendFileSync).toHaveBeenCalledWith(
      '/tmp/github-output',
      'should-run=true\nforges=["gitlab"]\n',
    )
  })

  it('runs labeled events when the override label already exists', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        {
          ...baseEnvironment,
          EVENT_ACTION: 'labeled',
          LABEL_NAME: 'documentation',
          HAS_OVERRIDE_LABEL: 'true',
        },
        runGit,
      ),
    ).toEqual({
      shouldRun: true,
      reason: 'pull request has override label ci:forge-conformance',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('runs non-labeled pull request events when the override label exists', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        { ...baseEnvironment, HAS_OVERRIDE_LABEL: 'true' },
        runGit,
      ),
    ).toEqual({
      shouldRun: true,
      reason: 'pull request has override label ci:forge-conformance',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it.each(['', '0'.repeat(40)])(
    'fails open for a missing or zero base SHA (%s)',
    (baseSha) => {
      const runGit = gitRunner()

      expect(
        routeForgeConformance(
          { ...baseEnvironment, PR_BASE_SHA: baseSha },
          runGit,
        ),
      ).toMatchObject({ shouldRun: true, warning: expect.any(String) })
      expect(runGit).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['invalid base', [2]],
    ['diff status greater than one', [0, 2]],
    ['git process error', [0, null]],
  ])('fails open for %s', (_name, statuses) => {
    expect(
      routeForgeConformance(baseEnvironment, gitRunner(...statuses)),
    ).toMatchObject({
      shouldRun: true,
      reason: 'changed-file detection failed open',
      warning: expect.any(String),
    })
  })

  it('uses the exact fixed git pathspec arguments without a shell', () => {
    const runGit = gitRunner(0, 0, 0)

    routeForgeConformance(baseEnvironment, runGit)

    expect(runGit).toHaveBeenNthCalledWith(1, 'git', [
      'cat-file',
      '-e',
      'abc123^{commit}',
    ])
    expect(runGit).toHaveBeenNthCalledWith(2, 'git', [
      'diff',
      '--quiet',
      '--no-renames',
      'abc123',
      'HEAD',
      '--',
      ...FORGE_CONFORMANCE_PATHSPECS,
    ])
    expect(FORGE_CONFORMANCE_PATHSPECS).not.toContain('package-lock.json')
    expect(FORGE_CONFORMANCE_PATHSPECS).not.toContain(
      ':(glob)packages/*/package.json',
    )
    expect(FORGE_CONFORMANCE_PATHSPECS).toContain(':(glob)packages/core/src/**')
    expect(FORGE_CONFORMANCE_PATHSPECS).toContain(
      ':(glob)packages/gitlab-adapter/src/**',
    )
    expect(FORGE_CONFORMANCE_PATHSPECS).not.toContain(
      'packages/gh-actions/package.json',
    )
  })

  describe('lockfile dependency routing', () => {
    const lockfile = () => ({
      lockfileVersion: 3,
      packages: {
        '': {
          devDependencies: {
            vitest: '^4',
            vite: '^8',
            testcontainers: '^12',
            biome: '^2',
          },
        },
        ...Object.fromEntries(
          [
            'core',
            'release-drafter',
            'github-adapter',
            'rest-adapter',
            'gitea-adapter',
            'forgejo-adapter',
            'gitlab-adapter',
          ].map((name) => [
            `packages/${name}`,
            { dependencies: { shared: '^1' } },
          ]),
        ),
        'packages/gh-actions': { devDependencies: { webhooks: '^1' } },
        'node_modules/webhooks': { version: '1.0.0', dev: true },
        'node_modules/vitest': { version: '4.0.0' },
        'node_modules/vite': { version: '8.0.0' },
        'node_modules/@vitest/coverage-v8': { version: '4.0.0' },
        'node_modules/biome': { version: '2.0.0' },
        'node_modules/testcontainers': { version: '12.0.0' },
        'node_modules/shared': {
          version: '1.0.0',
          dependencies: { transitive: '^1' },
        },
        'node_modules/transitive': { version: '1.0.0' },
      } as Record<string, Record<string, unknown>>,
    })
    const routeLocks = (before: unknown, after: unknown) => {
      const runGit = gitRunner(0, 0)
      runGit.mockReturnValueOnce({ status: 0, stdout: 'package-lock.json\n' })
      runGit.mockReturnValueOnce({ status: 0, stdout: JSON.stringify(before) })
      runGit.mockReturnValueOnce({ status: 0, stdout: JSON.stringify(after) })
      return routeForgeConformance(baseEnvironment, runGit)
    }

    it('skips a gh-actions webhook dependency replacement', () => {
      const before = lockfile()
      const after = lockfile()
      delete after.packages['node_modules/webhooks']
      after.packages['node_modules/openapi-webhooks'] = {
        version: '12.1.0',
        dev: true,
      }
      after.packages['packages/gh-actions'] = {
        devDependencies: { 'openapi-webhooks': '^12' },
      }
      expect(routeLocks(before, after)).toEqual({
        shouldRun: false,
        reason: 'no relevant files or dependencies changed',
      })
    })

    it.each(['shared', 'transitive', 'vitest', 'vite', 'testcontainers'])(
      'runs when the resolved %s dependency changes',
      (name) => {
        const before = lockfile()
        const after = lockfile()
        after.packages[`node_modules/${name}`].version = '99.0.0'
        expect(routeLocks(before, after)).toEqual({
          shouldRun: true,
          reason: 'forge dependencies changed',
        })
      },
    )

    it('skips unrelated root tooling and workspace development dependencies', () => {
      const before = lockfile()
      before.packages['packages/core'].devDependencies = { biome: '^2' }
      before.packages['node_modules/vitest'].peerDependencies = { biome: '^2' }
      before.packages['node_modules/vitest'].peerDependenciesMeta = {
        biome: { optional: true },
      }
      const after = structuredClone(before)
      after.packages[''].devDependencies = {
        vitest: '^4',
        vite: '^8',
        testcontainers: '^12',
        biome: '^3',
      }
      after.packages['packages/core'].devDependencies = { biome: '^3' }
      after.packages['node_modules/biome'].version = '3.0.0'
      expect(routeLocks(before, after).shouldRun).toBe(false)
    })

    it('skips workspace version, license, and range normalization with unchanged resolutions', () => {
      const before = lockfile()
      const after = lockfile()
      after.packages['packages/core'].version = '99.0.0'
      after.packages['packages/core'].license = 'MIT'
      after.packages['packages/core'].dependencies = { shared: '^1.0.1' }
      expect(routeLocks(before, after).shouldRun).toBe(false)
    })

    it('still runs when unrelated tooling updates a shared runtime dependency', () => {
      const before = lockfile()
      before.packages['node_modules/biome'].dependencies = { shared: '^1' }
      const after = structuredClone(before)
      after.packages['node_modules/shared'].version = '2.0.0'
      expect(routeLocks(before, after).shouldRun).toBe(true)
    })

    it('ignores dev classification changes caused by unrelated workspaces', () => {
      const before = lockfile()
      const after = lockfile()
      after.packages['node_modules/shared'].dev = true
      expect(routeLocks(before, after).shouldRun).toBe(false)
    })

    it('follows nested dependencies and workspace links', () => {
      const before = lockfile()
      before.packages['node_modules/shared'].dependencies = { linked: '*' }
      before.packages['node_modules/linked'] = {
        link: true,
        resolved: 'packages/linked',
      }
      before.packages['packages/linked'] = { dependencies: { nested: '^1' } }
      before.packages['packages/linked/node_modules/nested'] = {
        version: '1.0.0',
      }
      const after = structuredClone(before)
      after.packages['packages/linked/node_modules/nested'].version = '2.0.0'
      expect(routeLocks(before, after).shouldRun).toBe(true)
    })

    it('includes installed optional and peer dependencies', () => {
      const before = lockfile()
      before.packages['node_modules/shared'].optionalDependencies = {
        optional: '^1',
        missing: '^1',
      }
      before.packages['node_modules/shared'].peerDependencies = { peer: '^1' }
      before.packages['node_modules/optional'] = { version: '1.0.0' }
      before.packages['node_modules/peer'] = { version: '1.0.0' }
      for (const name of ['optional', 'peer']) {
        const after = structuredClone(before)
        after.packages[`node_modules/${name}`].version = '2.0.0'
        expect(routeLocks(before, after).shouldRun).toBe(true)
      }
    })

    it.each(['missing dependency', 'unsupported format', 'missing workspace'])(
      'fails open for %s',
      (failure) => {
        const before = lockfile()
        const after = lockfile()
        if (failure === 'missing dependency')
          delete after.packages['node_modules/shared']
        if (failure === 'missing workspace')
          delete after.packages['packages/core']
        if (failure === 'unsupported format') after.lockfileVersion = 1
        expect(routeLocks(before, after)).toMatchObject({
          shouldRun: true,
          warning: expect.any(String),
        })
      },
    )

    it('fails open when git cannot inspect the lockfile', () => {
      expect(
        routeForgeConformance(baseEnvironment, gitRunner(0, 0, 2)),
      ).toMatchObject({ shouldRun: true, warning: expect.any(String) })
      expect(
        routeForgeConformance(baseEnvironment, gitRunner(0, 0, 2)),
      ).toMatchObject({ shouldRun: true, warning: expect.any(String) })
    })
  })

  describe('manifest routing', () => {
    const routeManifest = (path: string, before: unknown, after: unknown) => {
      const runGit = gitRunner(0, 0)
      runGit.mockReturnValueOnce({ status: 0, stdout: `${path}\n` })
      runGit.mockReturnValueOnce({ status: 0, stdout: JSON.stringify(before) })
      runGit.mockReturnValueOnce({ status: 0, stdout: JSON.stringify(after) })
      return routeForgeConformance(baseEnvironment, runGit)
    }

    it('skips root formatting, code generation, and type tooling changes', () => {
      expect(
        routeManifest(
          'package.json',
          {
            devDependencies: {
              '@biomejs/biome': '2.5.3',
              typescript: '^7',
              '@graphql-codegen/cli': '^7',
            },
            scripts: { format: 'biome format .', ci: 'npm run test:run' },
          },
          {
            devDependencies: {
              '@biomejs/biome': '2.5.14',
              typescript: '^8',
              '@graphql-codegen/cli': '^8',
            },
            scripts: {
              format: 'biome format --write .',
              ci: 'npm run test:run && npm run lint',
            },
          },
        ).shouldRun,
      ).toBe(false)
    })

    it('skips workspace development dependency and publication metadata changes', () => {
      expect(
        routeManifest(
          'packages/core/package.json',
          {
            version: '1',
            license: 'ISC',
            devDependencies: { vitest: '^4' },
            scripts: { build: 'vite build' },
          },
          {
            version: '2',
            license: 'MIT',
            devDependencies: { vitest: '^5' },
            scripts: { build: 'vite build --config something.ts' },
          },
        ).shouldRun,
      ).toBe(false)
    })

    it.each([
      ['package.json', { devDependencies: { vitest: '^5' } }],
      [
        'package.json',
        { scripts: { 'test:conformance:gitlab': 'different-command' } },
      ],
      ['package.json', { overrides: { shared: '2' } }],
      ['packages/core/package.json', { dependencies: { shared: '^2' } }],
      [
        'packages/release-drafter/package.json',
        { exports: { '.': './different.ts' } },
      ],
    ])('runs for relevant settings in %s', (path, after) => {
      expect(routeManifest(path, {}, after)).toEqual({
        shouldRun: true,
        reason: 'forge package settings changed',
      })
    })

    it('fails open when changed manifests cannot be read', () => {
      const runGit = gitRunner(0, 0)
      runGit.mockReturnValueOnce({ status: 0, stdout: 'package.json\n' })
      runGit.mockReturnValueOnce({ status: 128 })
      expect(routeForgeConformance(baseEnvironment, runGit)).toMatchObject({
        shouldRun: true,
        warning: expect.any(String),
      })
    })
  })

  it('routes actual git diffs for gh-actions and forge workspace changes', () => {
    const directory = mkdtempSync(join(tmpdir(), 'forge-router-'))
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim()
    const runGit: GitRunner = (executable, args) =>
      spawnSync(executable, args, { cwd: directory, encoding: 'utf8' })
    try {
      git('init', '--quiet')
      git('config', 'user.name', 'Router Test')
      git('config', 'user.email', 'router@example.invalid')
      writeFileSync(join(directory, 'baseline'), 'baseline')
      git('add', '.')
      git('commit', '--quiet', '-m', 'baseline')
      const base = git('rev-parse', 'HEAD')
      for (const [file, shouldRun] of [
        ['packages/gh-actions/package.json', false],
        ['packages/gh-actions/tsconfig.json', false],
        ['packages/gh-actions/src/autolabeler/runner.ts', false],
        ['packages/core/package.json', true],
        ['packages/core/src/ports.ts', true],
        ['packages/core/src/new-helper.ts', true],
        ['packages/gitlab-adapter/src/new-helper.ts', true],
        ['packages/core/src/release/generate-changelog.ts', true],
        ['packages/core/src/category-matching.ts', true],
        ['packages/release-drafter/src/cli.ts', false],
        ['packages/rest-adapter/src/index.test.ts', false],
        ['packages/github-adapter/src/index.ts', true],
        ['src/tests/integration/forge-conformance/github.test.ts', false],
        ['src/tests/integration/forge-conformance/contract.ts', true],
        ['vite.config.ts', false],
        ['vitest.gitlab.config.ts', true],
        ['.github/workflows/ci.yml', false],
        ['packages/gitlab-adapter/tsconfig.json', true],
        ['packages/rest-adapter/src/index.ts', true],
      ] as const) {
        git('read-tree', '--empty')
        // Store a blob and index entry directly so the fixture needs no directory tree.
        const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {
          cwd: directory,
          input: '{}',
          encoding: 'utf8',
        }).trim()
        git('update-index', '--add', '--cacheinfo', `100644,${blob},${file}`)
        git('commit', '--quiet', '-m', file)
        expect(
          routeForgeConformance(
            { ...baseEnvironment, PR_BASE_SHA: base },
            runGit,
          ).shouldRun,
          file,
        ).toBe(shouldRun)
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('appends the GitHub output and reports the decision and warning', () => {
    const appendFileSync = vi.fn()
    const log = vi.fn()
    const warn = vi.fn()

    emitForgeConformanceDecision(
      {
        shouldRun: true,
        reason: 'changed-file detection failed open',
        warning: 'git diff failed with status 2; running forge conformance',
      },
      '/tmp/github-output',
      { appendFileSync, log, warn },
    )

    expect(appendFileSync).toHaveBeenCalledWith(
      '/tmp/github-output',
      'should-run=true\nforges=["gitea","forgejo","gitlab"]\n',
    )
    expect(warn).toHaveBeenCalledWith(
      '::warning::git diff failed with status 2; running forge conformance',
    )
    expect(log).toHaveBeenCalledWith(
      'Forge conformance should-run=true: changed-file detection failed open',
    )
  })
})
