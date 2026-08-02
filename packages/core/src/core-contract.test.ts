import { describe, expect, it, vi } from 'vitest'
import { evaluateCategories } from './category-matching.ts'
import { configSchema, mergeInputAndConfig } from './config/index.ts'
import type { ForgeAdapter, Logger } from './ports.ts'
import {
  buildReleasePlan,
  draftRelease,
  executeReleasePlan,
  protectReleaseInput,
  selectPreviousReleases,
} from './release-orchestration.ts'
import type {
  ParsedConfig,
  PreviousReleaseConfig,
  Release,
  ReleasePayload,
} from './types.ts'

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}
const condition = (overrides: Record<string, unknown> = {}) => ({
  labels: [],
  'labels-mode': 'any' as const,
  paths: [],
  'paths-mode': 'any' as const,
  ...overrides,
})
const categories = [
  { type: 'pre-include' as const, when: [condition({ labels: ['included'] })] },
  { type: 'pre-exclude' as const, when: [condition({ paths: ['docs/**'] })] },
  {
    type: 'changelog' as const,
    title: 'Features',
    when: [
      condition({
        conventional: { types: ['feat'], scopes: [], breaking: undefined },
      }),
    ],
    'collapse-after': -1,
    'semver-increment': 'minor' as const,
    exclusive: true,
  },
  {
    type: 'changelog' as const,
    title: 'Ready',
    when: [condition({ labels: ['ready'] })],
    'collapse-after': -1,
    'semver-increment': 'patch' as const,
    exclusive: false,
  },
  {
    type: 'changelog' as const,
    title: 'Other',
    when: [],
    'collapse-after': -1,
    'semver-increment': 'patch' as const,
    exclusive: false,
  },
  {
    type: 'version-resolver' as const,
    when: [
      condition({ conventional: { types: [], scopes: [], breaking: true } }),
    ],
    'semver-increment': 'major' as const,
    exclusive: true,
  },
  {
    type: 'version-resolver' as const,
    when: [],
    'semver-increment': 'patch' as const,
    exclusive: false,
  },
] as ParsedConfig['categories']
const labels = (...names: string[]) => ({
  labels: names,
})
const previousReleaseConfig = (
  overrides: Partial<PreviousReleaseConfig> = {},
): PreviousReleaseConfig => ({
  commitish: 'main',
  'filter-by-commitish': false,
  'tag-prefix': '',
  prerelease: false,
  'include-pre-releases': false,
  'filter-by-range': '*',
  ...overrides,
})
const release = (overrides: Partial<Release> = {}): Release => ({
  id: overrides.tagName ?? 'v1.0.0',
  tagName: 'v1.0.0',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})
const orchestrationConfig = () =>
  mergeInputAndConfig({
    config: configSchema.parse({ commitish: 'main', template: '$CHANGES' }),
    input: {},
    logger,
  })
const adapter = (params: {
  draftReleases: boolean
  releases: Release[]
}): ForgeAdapter => ({
  capabilities: { draftReleases: params.draftReleases },
  listReleases: vi.fn().mockResolvedValue(params.releases),
  findChanges: vi.fn().mockResolvedValue({
    commits: [],
    pullRequests: [],
    newContributorLogins: new Set<string>(),
  }),
  resolveCommitish: vi
    .fn()
    .mockImplementation(({ commitish }) => Promise.resolve(commitish)),
  createRelease: vi
    .fn()
    .mockImplementation(({ payload }) =>
      Promise.resolve(release({ id: 'created', tagName: payload.tag })),
    ),
  updateRelease: vi
    .fn()
    .mockImplementation(({ release: existingRelease }) =>
      Promise.resolve(existingRelease),
    ),
})

describe('evaluateCategories', () => {
  it('combines conventional, labels, paths, prefilters, exclusivity, and version rules', () => {
    const result = evaluateCategories(
      {
        title: 'feat(core)!: add port',
        ...labels('included'),
        changedFiles: ['src/core.ts'],
      },
      categories,
    )
    expect(result.included).toBe(true)
    expect(
      result.changelogCategories.map((category) => category.title),
    ).toEqual(['Features'])
    expect(result.versionIncrement).toBe('major')
    expect(result.fallbackOnly).toBe(false)
  })

  it('applies exclusion after inclusion', () => {
    expect(
      evaluateCategories(
        {
          title: 'docs: update',
          ...labels('included'),
          changedFiles: ['docs/guide.md'],
        },
        categories,
      ).included,
    ).toBe(false)
  })

  it('reports unconditional fallback-only matches', () => {
    const result = evaluateCategories(
      {
        title: 'chore: tidy',
        ...labels('included'),
        changedFiles: ['src/tidy.ts'],
      },
      categories,
    )
    expect(result.usedChangelogFallback).toBe(true)
    expect(result.usedVersionFallback).toBe(true)
    expect(result.fallbackOnly).toBe(true)
  })
})

describe('release write protection', () => {
  const payload: ReleasePayload = {
    name: 'v1.0.0',
    tag: 'v1.0.0',
    body: 'notes',
    targetCommitish: 'main',
    prerelease: false,
    makeLatest: true,
    draft: true,
  }
  const repository = {
    owner: 'release-drafter',
    name: 'release-drafter',
    serverUrl: 'https://github.com',
  }

  it('forces pull-request merge refs into dry-run mode', () => {
    expect(
      protectReleaseInput({
        commitish: 'refs/pull/42/merge',
        input: { publish: true },
        logger,
      }),
    ).toEqual({ publish: false, dryRun: true })
    expect(logger.warning).toHaveBeenCalled()
  })

  it('never invokes create or update writes during dry-run', async () => {
    const adapter = { createRelease: vi.fn(), updateRelease: vi.fn() }
    const createPlan = buildReleasePlan({
      input: { dryRun: true },
      releasePayload: payload,
    })
    const updatePlan = buildReleasePlan({
      draftRelease: { id: 1, tagName: 'v0.9.0' },
      input: { dryRun: true },
      releasePayload: payload,
    })
    await executeReleasePlan({
      adapter,
      logger,
      plan: createPlan,
      repository,
    })
    await executeReleasePlan({
      adapter,
      logger,
      plan: updatePlan,
      repository,
    })
    expect(adapter.createRelease).not.toHaveBeenCalled()
    expect(adapter.updateRelease).not.toHaveBeenCalled()
  })

  it('scopes create and update writes to the requested repository', async () => {
    const createdRelease = release({ id: 'created', tagName: payload.tag })
    const updatedRelease = release({ id: 'updated', tagName: payload.tag })
    const adapter = {
      createRelease: vi.fn().mockResolvedValue(createdRelease),
      updateRelease: vi.fn().mockResolvedValue(updatedRelease),
    }
    const draftRelease = release({ id: 'draft', tagName: 'v0.9.0' })

    await expect(
      executeReleasePlan({
        adapter,
        logger,
        plan: buildReleasePlan({ input: {}, releasePayload: payload }),
        repository,
      }),
    ).resolves.toBe(createdRelease)
    await expect(
      executeReleasePlan({
        adapter,
        logger,
        plan: buildReleasePlan({
          draftRelease,
          input: {},
          releasePayload: payload,
        }),
        repository,
      }),
    ).resolves.toBe(updatedRelease)

    expect(adapter.createRelease).toHaveBeenCalledWith({
      repository,
      payload,
    })
    expect(adapter.updateRelease).toHaveBeenCalledWith({
      repository,
      release: draftRelease,
      payload,
    })
  })
})

describe('previous release selection', () => {
  it('sorts semantic versions after stripping the configured tag prefix', () => {
    const releases = [
      release({ id: 10, tagName: 'release-v10.0.0' }),
      release({ id: 2, tagName: 'release-v2.0.0' }),
      release({ id: 9, tagName: 'release-v9.0.0' }),
    ]

    expect(
      selectPreviousReleases({
        config: previousReleaseConfig({ 'tag-prefix': 'release-' }),
        logger,
        releases,
      }).lastRelease,
    ).toBe(releases[0])
    expect(releases.map(({ tagName }) => tagName)).toEqual([
      'release-v10.0.0',
      'release-v2.0.0',
      'release-v9.0.0',
    ])
  })

  it('falls back to release creation time for non-semver tags', () => {
    const newest = release({
      id: 2,
      tagName: 'nightly-current',
      createdAt: '2026-02-01T00:00:00Z',
    })

    expect(
      selectPreviousReleases({
        config: previousReleaseConfig(),
        logger,
        releases: [
          newest,
          release({
            id: 1,
            tagName: 'nightly-previous',
            createdAt: '2026-01-01T00:00:00Z',
          }),
        ],
      }).lastRelease,
    ).toBe(newest)
  })

  it('uses a deterministic tie-breaker when versions and dates do not order releases', () => {
    const selectedIds = [
      [
        release({ id: 'b', tagName: 'nightly' }),
        release({ id: 'a', tagName: 'nightly' }),
      ],
      [
        release({ id: 'a', tagName: 'nightly' }),
        release({ id: 'b', tagName: 'nightly' }),
      ],
    ].map(
      (releases) =>
        selectPreviousReleases({
          config: previousReleaseConfig(),
          logger,
          releases,
        }).lastRelease?.id,
    )

    expect(selectedIds).toEqual(['b', 'b'])
  })

  it('filters drafts, prereleases, commitishes, prefixes, and ranges before sorting', () => {
    const selected = release({
      id: 'selected',
      tagName: 'core-v1.5.0',
      targetCommitish: 'main',
    })
    const result = selectPreviousReleases({
      config: previousReleaseConfig({
        commitish: 'refs/heads/main',
        'filter-by-commitish': true,
        'filter-by-range': '>=1.0.0 <2.0.0',
        'tag-prefix': 'core-',
      }),
      logger,
      releases: [
        release({
          id: 'draft',
          tagName: 'core-v1.6.0',
          targetCommitish: 'main',
          draft: true,
        }),
        release({ id: 'prerelease', tagName: 'core-v1.7.0', prerelease: true }),
        release({
          id: 'other-branch',
          tagName: 'core-v1.8.0',
          targetCommitish: 'next',
        }),
        release({
          id: 'other-prefix',
          tagName: 'v1.9.0',
          targetCommitish: 'main',
        }),
        release({
          id: 'out-of-range',
          tagName: 'core-v2.0.0',
          targetCommitish: 'main',
        }),
        selected,
      ],
    })

    expect(result.draftRelease?.id).toBe('draft')
    expect(result.lastRelease).toBe(selected)
  })

  it('selects no published release for an invalid configured semver range', () => {
    expect(
      selectPreviousReleases({
        config: previousReleaseConfig({ 'filter-by-range': 'not a range' }),
        logger,
        releases: [release()],
      }).lastRelease,
    ).toBeUndefined()
  })
})

describe('draftRelease', () => {
  const repository = {
    owner: 'release-drafter',
    name: 'release-drafter',
    serverUrl: 'https://github.com',
  }

  it('uses an explicit from only as the change comparison base', async () => {
    const existingDraft = release({
      id: 'draft',
      tagName: 'v1.1.0',
      draft: true,
    })
    const forge = adapter({
      draftReleases: true,
      releases: [release({ tagName: 'v1.0.0' }), existingDraft],
    })

    const result = await draftRelease({
      adapter: forge,
      config: orchestrationConfig(),
      input: { publish: false, dryRun: true, from: 'v0.1.0' },
      logger,
      repository,
    })

    expect(forge.findChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        comparison: { baseRef: 'v0.1.0', headRef: 'main' },
      }),
    )
    expect(result.releasePayload.resolvedVersion).toBe('1.0.1')
    expect(result.plan).toMatchObject({
      action: 'dry-run',
      draftRelease: existingDraft,
    })
  })

  it('finds changes from an explicit from without a selected release', async () => {
    const forge = adapter({ draftReleases: true, releases: [] })

    const result = await draftRelease({
      adapter: forge,
      config: orchestrationConfig(),
      input: { publish: false, dryRun: true, from: 'initial-commit' },
      logger,
      repository,
    })

    expect(forge.findChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        comparison: { baseRef: 'initial-commit', headRef: 'main' },
      }),
    )
    expect(result.releasePayload.resolvedVersion).toBe('0.0.1')
  })

  it('uses the selected last release tag as the default comparison base', async () => {
    const forge = adapter({
      draftReleases: true,
      releases: [release({ tagName: 'v1.0.0' })],
    })

    await draftRelease({
      adapter: forge,
      config: orchestrationConfig(),
      input: { publish: false, dryRun: true },
      logger,
      repository,
    })

    expect(forge.findChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        comparison: { baseRef: 'refs/tags/v1.0.0', headRef: 'main' },
      }),
    )
  })

  it('makes publish false calculation-only when the forge has no drafts', async () => {
    const forge = adapter({
      draftReleases: false,
      releases: [release({ tagName: 'v1.0.0' })],
    })

    const result = await draftRelease({
      adapter: forge,
      config: orchestrationConfig(),
      input: { publish: false, tag: 'v2.0.0' },
      logger,
      repository,
    })

    expect(result.plan.action).toBe('dry-run')
    expect(forge.createRelease).not.toHaveBeenCalled()
    expect(forge.updateRelease).not.toHaveBeenCalled()
    expect(forge.listReleases).toHaveBeenCalledWith({ repository })
    expect(forge.resolveCommitish).toHaveBeenCalledWith({
      repository,
      commitish: 'main',
    })
    expect(forge.findChanges).toHaveBeenCalledWith(
      expect.objectContaining({ repository }),
    )
  })

  it('updates an existing published tag when a no-draft forge publishes', async () => {
    const existingRelease = release({
      id: 'existing',
      tagName: 'v2.0.0',
      createdAt: '2026-02-01T00:00:00Z',
    })
    const forge = adapter({
      draftReleases: false,
      releases: [release({ tagName: 'v1.0.0' }), existingRelease],
    })

    const result = await draftRelease({
      adapter: forge,
      config: orchestrationConfig(),
      input: { publish: true, tag: existingRelease.tagName },
      logger,
      repository,
    })

    expect(result.plan.action).toBe('update')
    expect(forge.createRelease).not.toHaveBeenCalled()
    expect(forge.updateRelease).toHaveBeenCalledWith({
      repository,
      release: existingRelease,
      payload: result.releasePayload,
    })
  })

  it('keeps concurrent repository requests isolated on one adapter', async () => {
    const forge = adapter({
      draftReleases: true,
      releases: [release({ tagName: 'v1.0.0' })],
    })
    const repositories = [
      repository,
      {
        owner: 'example',
        name: 'other',
        serverUrl: 'https://git.example.test',
      },
    ]

    await Promise.all(
      repositories.map((currentRepository) =>
        draftRelease({
          adapter: forge,
          config: orchestrationConfig(),
          input: { publish: false, dryRun: true, tag: 'v2.0.0' },
          logger,
          repository: currentRepository,
        }),
      ),
    )

    expect(forge.listReleases).toHaveBeenCalledTimes(2)
    expect(vi.mocked(forge.listReleases).mock.calls).toEqual(
      repositories.map((currentRepository) => [
        { repository: currentRepository },
      ]),
    )
    expect(
      vi
        .mocked(forge.findChanges)
        .mock.calls.map(([request]) => request.repository),
    ).toEqual(repositories)
    expect(
      vi
        .mocked(forge.resolveCommitish)
        .mock.calls.map(([request]) => request.repository),
    ).toEqual(repositories)
  })
})
