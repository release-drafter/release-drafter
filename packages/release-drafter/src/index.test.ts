// biome-ignore lint/correctness/noUndeclaredDependencies: Vitest is provided by the root workspace for package-local tests.
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

const { coreDraftRelease } = vi.hoisted(() => ({
  coreDraftRelease: vi.fn(),
}))

vi.mock('@release-drafter/core', () => ({
  draftRelease: coreDraftRelease,
  noopLogger: {
    debug() {},
    info() {},
    warning() {},
    error() {},
  },
}))

import {
  type CreateForgeAdapterOptions,
  createForgeAdapter,
  type DraftReleaseConfig,
  type DraftReleaseOptions,
  type DraftReleaseResult,
  draftRelease,
  type ForgeAdapter,
  type ForgejoForgeAdapterOptions,
  type GiteaForgeAdapterOptions,
  type GitHubForgeAdapterOptions,
  type GitLabForgeAdapterOptions,
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

describe('createForgeAdapter', () => {
  it.each([
    ['github', true],
    ['gitea', true],
    ['forgejo', true],
    ['gitlab', false],
  ] as const)('constructs the bundled %s adapter', (forge, draftReleases) => {
    const options = {
      forge,
      token: 'not-a-real-token',
      fetch: vi.fn(),
    } as CreateForgeAdapterOptions

    const created = createForgeAdapter(options)

    expect(created.capabilities.draftReleases).toBe(draftReleases)
    expect(created.listReleases).toEqual(expect.any(Function))
    expect(created.findChanges).toEqual(expect.any(Function))
  })

  it('exposes only structural public factory options', () => {
    expectTypeOf(createForgeAdapter)
      .parameter(0)
      .toEqualTypeOf<CreateForgeAdapterOptions>()
    expectTypeOf(createForgeAdapter).returns.toEqualTypeOf<ForgeAdapter>()

    const github = {
      forge: 'github',
      token: 'token',
      requestRetries: 1,
    } satisfies GitHubForgeAdapterOptions
    const gitea = {
      forge: 'gitea',
      token: 'token',
      limits: { maxPages: 2 },
    } satisfies GiteaForgeAdapterOptions
    const forgejo = {
      forge: 'forgejo',
      token: 'token',
      limits: { maxRequestsPerOperation: 3 },
    } satisfies ForgejoForgeAdapterOptions
    const gitlab = {
      forge: 'gitlab',
      token: 'token',
      limits: { retries: 0, maxAssociatedMergeRequests: 4 },
    } satisfies GitLabForgeAdapterOptions
    void [github, gitea, forgejo, gitlab]

    // @ts-expect-error GitHub has no structural REST or GitLab limits.
    createForgeAdapter({ forge: 'github', token: 'token', limits: {} })
  })

  it.each([
    {
      forge: 'github',
      url: 'https://api.github.com/repos/release-drafter/release-drafter/releases?per_page=100',
      header: 'authorization',
      authorization: 'token facade-token',
    },
    {
      forge: 'gitea',
      url: 'https://gitea.com/api/v1/repos/release-drafter/release-drafter/releases?page=1&limit=50',
      header: 'authorization',
      authorization: 'token facade-token',
    },
    {
      forge: 'forgejo',
      url: 'https://codeberg.org/api/v1/repos/release-drafter/release-drafter/releases?page=1&limit=50',
      header: 'authorization',
      authorization: 'token facade-token',
    },
    {
      forge: 'gitlab',
      url: 'https://gitlab.com/api/v4/projects/release-drafter%2Frelease-drafter/releases?page=1&per_page=50',
      header: 'private-token',
      authorization: 'facade-token',
    },
  ] as const)('wires the default $forge endpoint and authentication', async ({
    forge,
    url,
    header,
    authorization,
  }) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      expect(String(input)).toBe(url)
      expect(new Headers(init?.headers).get(header)).toBe(authorization)
      return new Response('[]', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-total': '0',
        },
      })
    })
    const created = createForgeAdapter({
      forge,
      token: 'facade-token',
      fetch,
    })

    await expect(created.listReleases({ repository })).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledOnce()
  })

  it.each([
    {
      forge: 'gitea',
      apiUrl: 'https://gitea.com/api/v1',
      expectedCommitish: 'main',
    },
    {
      forge: 'forgejo',
      apiUrl: 'https://codeberg.org/api/v1',
      expectedCommitish: 'refs/heads/main',
    },
  ] as const)('delegates $forge release operations through the bundled adapter', async ({
    forge,
    apiUrl,
    expectedCommitish,
  }) => {
    const releasesUrl = `${apiUrl}/repos/release-drafter/release-drafter/releases`
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      const method = init?.method ?? 'GET'
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'token facade-token',
      )
      if (method === 'POST') {
        expect(String(input)).toBe(releasesUrl)
        return Response.json({ id: 1, tag_name: payload.tag })
      }
      expect(method).toBe('PATCH')
      expect(String(input)).toBe(`${releasesUrl}/1`)
      return Response.json({ id: 1, tag_name: payload.tag })
    })
    const created = createForgeAdapter({
      forge,
      token: 'facade-token',
      fetch,
    })

    await expect(
      created.resolveCommitish({
        repository,
        commitish: 'refs/heads/main',
      }),
    ).resolves.toBe(expectedCommitish)
    const release = await created.createRelease({ repository, payload })
    await expect(
      created.updateRelease({ repository, release, payload }),
    ).resolves.toMatchObject({ id: 1, tagName: payload.tag })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
