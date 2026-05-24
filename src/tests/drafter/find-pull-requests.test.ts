import { mergeInputAndConfig } from 'src/actions/drafter/config'
import { commonConfigSchema } from 'src/actions/drafter/config/schemas/common-config.schema'
import { configSchema } from 'src/actions/drafter/config/schemas/config.schema'
import { findPullRequests } from 'src/actions/drafter/lib/find-pull-requests'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as z from 'zod'
import { mockContext } from '../mocks'

const localMocks = vi.hoisted(() => ({
  findCommitsInComparison: vi.fn(),
  findCommitsWithPathChange: vi.fn(),
}))

vi.mock(
  import(
    'src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison'
  ),
  () => ({
    findCommitsInComparison: localMocks.findCommitsInComparison,
  }),
)

vi.mock(
  import(
    'src/actions/drafter/lib/find-pull-requests/find-commits-with-path-change'
  ),
  () => ({
    findCommitsWithPathChange: localMocks.findCommitsWithPathChange,
  }),
)

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

type PullRequestWithMatchedPaths = Awaited<
  ReturnType<typeof findPullRequests>
>['pullRequests'][number] & {
  matchedPaths?: string[]
}

describe('findPullRequests', () => {
  beforeEach(async () => {
    await mockContext('push')
    localMocks.findCommitsInComparison.mockReset()
    localMocks.findCommitsWithPathChange.mockReset()
  })

  it('keeps PR matched paths from comparison commits filtered out by pre-include', async () => {
    const docsCommitId = 'docs-commit'
    const srcCommitId = 'src-commit'

    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit(docsCommitId, 1),
      makeCommit(srcCommitId, 1),
    ])
    localMocks.findCommitsWithPathChange.mockResolvedValue({
      commitIdsMatchingPaths: {
        'docs/**': new Set([docsCommitId]),
        'src/**': new Set([srcCommitId]),
      },
      hasFoundCommits: true,
    })

    const result = await findPullRequests({
      lastRelease: {
        tag_name: 'v1.0.0',
      } as Awaited<
        ReturnType<
          typeof import('src/actions/drafter/lib/find-previous-releases').findPreviousReleases
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

    expect(result.commits.map((commit) => commit.id)).toEqual([srcCommitId])
    expect(result.pullRequests).toHaveLength(1)
    expect(
      (result.pullRequests[0] as PullRequestWithMatchedPaths | undefined)
        ?.matchedPaths,
    ).toEqual(['docs/**', 'src/**'])
  })

  it('keeps PR matched paths from comparison commits filtered out by pre-exclude', async () => {
    const docsCommitId = 'docs-commit'
    const srcCommitId = 'src-commit'

    localMocks.findCommitsInComparison.mockResolvedValue([
      makeCommit(docsCommitId, 1),
      makeCommit(srcCommitId, 1),
    ])
    localMocks.findCommitsWithPathChange.mockResolvedValue({
      commitIdsMatchingPaths: {
        'docs/**': new Set([docsCommitId]),
        'src/**': new Set([srcCommitId]),
      },
      hasFoundCommits: true,
    })

    const result = await findPullRequests({
      lastRelease: {
        tag_name: 'v1.0.0',
      } as Awaited<
        ReturnType<
          typeof import('src/actions/drafter/lib/find-previous-releases').findPreviousReleases
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

    expect(result.commits.map((commit) => commit.id)).toEqual([srcCommitId])
    expect(result.pullRequests).toHaveLength(1)
    expect(
      (result.pullRequests[0] as PullRequestWithMatchedPaths | undefined)
        ?.matchedPaths,
    ).toEqual(['docs/**', 'src/**'])
  })
})
