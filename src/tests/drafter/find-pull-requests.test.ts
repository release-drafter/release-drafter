import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as z from 'zod'
import { mergeInputAndConfig } from '#src/actions/drafter/config/index.ts'
import { commonConfigSchema } from '#src/actions/drafter/config/schemas/common-config.schema.ts'
import { configSchema } from '#src/actions/drafter/config/schemas/config.schema.ts'
import { categorizePullRequests } from '#src/actions/drafter/lib/build-release-payload/categorize-pull-requests.ts'
import { findPullRequests } from '#src/actions/drafter/lib/find-pull-requests/index.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { mockContext } from '../mocks/index.ts'

const localMocks = vi.hoisted(() => ({
  findCommitsInComparison: vi.fn(),
  graphql: vi.fn(),
  paginate: vi.fn(),
  listFiles: vi.fn(),
}))

vi.mock(
  import(
    '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts'
  ),
  () => ({
    findCommitsInComparison: localMocks.findCommitsInComparison,
  }),
)

vi.mock('#src/common/get-octokit.ts', () => ({
  getOctokit: () =>
    ({
      graphql: localMocks.graphql as unknown as Octokit['graphql'],
      paginate: localMocks.paginate as unknown as Octokit['paginate'],
      rest: {
        pulls: {
          listFiles:
            localMocks.listFiles as unknown as Octokit['rest']['pulls']['listFiles'],
        },
      },
    }) as unknown as Octokit,
}))

const makeConfig = (
  categories: NonNullable<z.input<typeof configSchema>['categories']>,
) =>
  mergeInputAndConfig({
    config: configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      categories,
    }),
    input: commonConfigSchema.parse({}),
  })

const makePullRequest = (number: number) => ({
  title: `PR ${number}`,
  number,
  url: `https://github.com/toolmantim/release-drafter-test-project/pull/${number}`,
  body: '',
  author: {
    login: 'octocat',
    __typename: 'User',
    url: 'https://github.com/octocat',
  },
  baseRepository: {
    nameWithOwner: 'toolmantim/release-drafter-test-project',
  },
  mergedAt: '2026-01-01T00:00:00Z',
  isCrossRepository: false,
  labels: {
    nodes: [],
  },
  merged: true,
  baseRefName: 'main',
  headRefName: `branch-${number}`,
})

const makeCommit = (id: string, pullRequestNumber: number) => ({
  id,
  associatedPullRequests: {
    nodes: [makePullRequest(pullRequestNumber)],
  },
})

type PullRequestWithChangedFiles = Awaited<
  ReturnType<typeof findPullRequests>
>['pullRequests'][number] & {
  changedFiles?: string[]
}

describe('findPullRequests', () => {
  beforeEach(async () => {
    await mockContext('push')
    localMocks.findCommitsInComparison.mockReset()
    localMocks.graphql.mockReset()
    localMocks.paginate.mockReset()
    localMocks.listFiles.mockReset()
  })

  it('identifies a first-time contribution from merge history', async () => {
    const commit = makeCommit('first-contribution', 42)
    const pullRequest = commit.associatedPullRequests.nodes[0]
    pullRequest.author.login = 'first-timer'
    pullRequest.mergedAt = '2026-07-11T15:17:17Z'
    localMocks.findCommitsInComparison.mockResolvedValue([
      commit,
      makeCommit('earlier-contributor', 1),
    ])
    localMocks.graphql.mockResolvedValue({
      author0: { issueCount: 0 },
      author1: { issueCount: 1 },
    })

    const config = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$NEW_CONTRIBUTORS',
        commitish: 'refs/heads/main',
      }),
      input: commonConfigSchema.parse({}),
    })

    const result = await findPullRequests({
      lastRelease: { tag_name: 'v1.0.0' } as Awaited<
        ReturnType<
          typeof import('#src/actions/drafter/lib/find-previous-releases/index.ts').findPreviousReleases
        >
      >['lastRelease'],
      config,
    })

    expect(result.newContributorLogins).toEqual(new Set(['first-timer']))
    expect(localMocks.graphql).toHaveBeenCalledWith(
      expect.stringContaining('query findPreviousContributions'),
      {
        query0:
          'repo:toolmantim/release-drafter-test-project is:pr is:merged author:first-timer merged:<2026-07-11T15:17:17Z',
        query1:
          'repo:toolmantim/release-drafter-test-project is:pr is:merged author:octocat merged:<2026-01-01T00:00:00Z',
      },
    )
  })

  it('loads changed files for path-based pre-include categories', async () => {
    const docsCommitId = 'docs-commit'
    const srcCommitId = 'src-commit'

    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit(docsCommitId, 1),
      makeCommit(srcCommitId, 1),
    ])
    localMocks.paginate.mockResolvedValue(['docs/readme.md', 'src/index.ts'])

    const result = await findPullRequests({
      lastRelease: {
        tag_name: 'v1.0.0',
      } as Awaited<
        ReturnType<
          typeof import('#src/actions/drafter/lib/find-previous-releases/index.ts').findPreviousReleases
        >
      >['lastRelease'],
      config: makeConfig([
        {
          type: 'pre-include',
          when: {
            paths: ['src/**'],
          },
        },
        {
          title: 'Docs',
          when: {
            paths: ['docs/**'],
          },
        },
      ]),
    })

    expect(result.commits.map((commit) => commit.id)).toEqual([
      docsCommitId,
      srcCommitId,
    ])
    expect(result.pullRequests).toHaveLength(1)
    expect(
      (result.pullRequests[0] as PullRequestWithChangedFiles | undefined)
        ?.changedFiles,
    ).toEqual(['docs/readme.md', 'src/index.ts'])
    expect(localMocks.paginate.mock.calls[0]?.[1]).toMatchObject({
      owner: 'toolmantim',
      repo: 'release-drafter-test-project',
      pull_number: 1,
      per_page: 50,
    })
  })

  it('loads changed files for path-based pre-exclude categories', async () => {
    const docsCommitId = 'docs-commit'
    const srcCommitId = 'src-commit'

    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit(docsCommitId, 1),
      makeCommit(srcCommitId, 1),
    ])
    localMocks.paginate.mockResolvedValue(['docs/readme.md', 'src/index.ts'])

    const result = await findPullRequests({
      lastRelease: {
        tag_name: 'v1.0.0',
      } as Awaited<
        ReturnType<
          typeof import('#src/actions/drafter/lib/find-previous-releases/index.ts').findPreviousReleases
        >
      >['lastRelease'],
      config: makeConfig([
        {
          type: 'pre-exclude',
          when: {
            paths: ['docs/**'],
          },
        },
        {
          title: 'Source',
          when: {
            paths: ['src/**'],
          },
        },
      ]),
    })

    expect(result.commits.map((commit) => commit.id)).toEqual([
      docsCommitId,
      srcCommitId,
    ])
    expect(result.pullRequests).toHaveLength(1)
    expect(
      (result.pullRequests[0] as PullRequestWithChangedFiles | undefined)
        ?.changedFiles,
    ).toEqual(['docs/readme.md', 'src/index.ts'])
  })

  it('treats deprecated exclude-paths as a pre-exclude alias', async () => {
    const docsCommitId = 'docs-commit'
    const srcCommitId = 'src-commit'

    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit(docsCommitId, 1),
      makeCommit(srcCommitId, 1),
    ])
    localMocks.paginate.mockResolvedValue(['docs/readme.md', 'src/index.ts'])

    const config = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        commitish: 'refs/heads/main',
        'exclude-paths': ['docs/**'],
      }),
      input: commonConfigSchema.parse({}),
    })

    const result = await findPullRequests({
      lastRelease: {
        tag_name: 'v1.0.0',
      } as Awaited<
        ReturnType<
          typeof import('#src/actions/drafter/lib/find-previous-releases/index.ts').findPreviousReleases
        >
      >['lastRelease'],
      config,
    })

    const [uncategorizedPullRequests] = categorizePullRequests({
      pullRequests: result.pullRequests,
      config,
    })

    expect(result.commits.map((commit) => commit.id)).toEqual([
      docsCommitId,
      srcCommitId,
    ])
    expect(result.pullRequests).toHaveLength(1)
    expect(uncategorizedPullRequests).toHaveLength(0)
  })

  it('keeps mixed-path PRs when pre-exclude uses paths-mode only', async () => {
    const docsCommitId = 'docs-commit'
    const srcCommitId = 'src-commit'

    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit(docsCommitId, 1),
      makeCommit(srcCommitId, 1),
    ])
    localMocks.paginate.mockResolvedValue(['docs/readme.md', 'src/index.ts'])

    const config = makeConfig([
      {
        type: 'pre-exclude',
        when: {
          paths: ['docs/**'],
          'paths-mode': 'only',
        },
      },
      {
        title: 'Source',
        when: {
          paths: ['src/**'],
        },
      },
    ])

    const result = await findPullRequests({
      lastRelease: {
        tag_name: 'v1.0.0',
      } as Awaited<
        ReturnType<
          typeof import('#src/actions/drafter/lib/find-previous-releases/index.ts').findPreviousReleases
        >
      >['lastRelease'],
      config,
    })

    const [uncategorizedPullRequests, categories] = categorizePullRequests({
      pullRequests: result.pullRequests,
      config,
    })

    expect(uncategorizedPullRequests).toHaveLength(0)
    expect(categories[0]?.pullRequests).toHaveLength(1)
  })

  it('adds context when loading changed files fails', async () => {
    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit('id-1', 7),
    ])
    localMocks.paginate.mockRejectedValue(new Error('boom'))

    await expect(
      findPullRequests({
        lastRelease: {
          tag_name: 'v1.0.0',
        } as Awaited<
          ReturnType<
            typeof import('#src/actions/drafter/lib/find-previous-releases/index.ts').findPreviousReleases
          >
        >['lastRelease'],
        config: makeConfig([
          {
            type: 'pre-include',
            when: {
              paths: ['src/**'],
            },
          },
        ]),
      }),
    ).rejects.toThrow('Failed to list changed files for pull request #7.')
  })
})
