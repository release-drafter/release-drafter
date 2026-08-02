// biome-ignore lint/correctness/noUndeclaredDependencies: Vitest is provided by the root workspace for package-local tests.
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

const { coreDraftRelease } = vi.hoisted(() => ({
  coreDraftRelease: vi.fn(),
}))

vi.mock('@release-drafter/core', () => ({
  draftRelease: coreDraftRelease,
}))

import {
  type DraftReleaseConfig,
  type DraftReleaseOptions,
  type DraftReleaseResult,
  draftRelease,
  type ForgeAdapter,
  type Logger,
  type ReleasePayload,
} from './index.ts'

const repository = {
  owner: 'release-drafter',
  name: 'release-drafter',
  serverUrl: 'https://example.test',
}

const config = {
  'change-template': '* $TITLE',
  'change-author-template': '$AUTHOR_MENTION',
  'change-authors-separator': ', ',
  'no-changes-template': '* No changes',
  'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE',
  'exclude-contributors': [],
  'new-contributor-template': '* $AUTHOR_MENTION',
  'no-new-contributor-template': '* No new contributors',
  'no-contributors-template': 'No contributors',
  'sort-by': 'merged_at',
  'sort-direction': 'descending',
  'filter-by-commitish': false,
  'pull-request-limit': 5,
  'history-limit': 15,
  replacers: [],
  categories: [],
  'category-template': '## $TITLE',
  template: '$CHANGES',
  latest: true,
  prerelease: false,
  commitish: 'main',
} satisfies DraftReleaseConfig

const payload: ReleasePayload = {
  name: 'v1.0.0',
  tag: 'v1.0.0',
  body: 'notes',
  targetCommitish: 'main',
  prerelease: false,
  makeLatest: true,
  draft: true,
}

const adapter: ForgeAdapter = {
  capabilities: { draftReleases: true },
  listReleases: vi.fn().mockResolvedValue([]),
  findChanges: vi.fn().mockResolvedValue({
    commits: [],
    pullRequests: [],
    newContributorLogins: new Set<string>(),
  }),
  resolveCommitish: vi.fn().mockResolvedValue('main'),
  createRelease: vi.fn().mockResolvedValue({ id: 1, tagName: 'v1.0.0' }),
  updateRelease: vi.fn().mockResolvedValue({ id: 1, tagName: 'v1.0.0' }),
}

const options: DraftReleaseOptions = {
  adapter,
  config,
  input: { publish: false, dryRun: true },
  repository,
}

const result: DraftReleaseResult = {
  plan: { action: 'dry-run', releasePayload: payload },
  releasePayload: payload,
}

describe('draftRelease', () => {
  beforeEach(() => {
    coreDraftRelease.mockReset()
    coreDraftRelease.mockResolvedValue(result)
  })

  it('has no orchestration side effects when imported', () => {
    expect(coreDraftRelease).not.toHaveBeenCalled()
  })

  it('delegates to the core contract and supplies a safe default logger', async () => {
    await expect(draftRelease(options)).resolves.toEqual(result)

    expect(coreDraftRelease).toHaveBeenCalledOnce()
    expect(coreDraftRelease).toHaveBeenCalledWith({
      ...options,
      logger: expect.objectContaining({
        debug: expect.any(Function),
        info: expect.any(Function),
        warning: expect.any(Function),
        error: expect.any(Function),
      }),
    })

    const [{ logger }] = coreDraftRelease.mock.calls[0]
    expect(() => {
      logger.debug('debug')
      logger.info('info')
      logger.warning('warning')
      logger.error(new Error('error'))
    }).not.toThrow()
  })

  it('passes an injected logger through unchanged', async () => {
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    }

    await draftRelease({ ...options, logger })

    expect(coreDraftRelease).toHaveBeenCalledWith({ ...options, logger })
  })

  it('exposes self-contained forge-neutral input and output types', () => {
    expectTypeOf(draftRelease).parameter(0).toEqualTypeOf<DraftReleaseOptions>()
    expectTypeOf(draftRelease).returns.toEqualTypeOf<
      Promise<DraftReleaseResult>
    >()
    expectTypeOf(options.adapter).toEqualTypeOf<ForgeAdapter>()
    expectTypeOf(result.releasePayload).toEqualTypeOf<ReleasePayload>()
  })
})
