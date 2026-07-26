import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCommitsInComparison } from '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts'
import { testGitHubContext } from '#tests/mocks/index.ts'

const localMocks = vi.hoisted(() => ({
  compareCommitsWithBasehead: vi.fn(),
  graphql: vi.fn(),
}))

vi.mock('#src/common/get-octokit.ts', () => ({
  getOctokit: () => ({
    graphql: localMocks.graphql,
    rest: {
      repos: {
        compareCommitsWithBasehead: localMocks.compareCommitsWithBasehead,
      },
    },
  }),
}))

const github = () =>
  testGitHubContext({
    octokit: {
      graphql: localMocks.graphql,
      rest: {
        repos: {
          compareCommitsWithBasehead: localMocks.compareCommitsWithBasehead,
        },
      },
    } as never,
  })

const commit = (oid: string) => ({
  __typename: 'Commit',
  id: oid,
  oid,
  committedDate: '2026-01-01T00:00:00Z',
  message: oid,
  author: null,
  authors: { nodes: [] },
  associatedPullRequests: { nodes: [] },
})

const response = (
  nodes: ReturnType<typeof commit>[],
  pageInfo: { hasNextPage: boolean; endCursor: string | null },
) => ({
  repository: {
    head: {
      __typename: 'Commit',
      history: { nodes, pageInfo },
    },
  },
})

const params = {
  name: 'example',
  owner: 'octocat',
  baseCommitish: 'base',
  headCommitish: 'main',
  withPullRequestBody: false,
  withPullRequestURL: false,
  withBaseRefName: false,
  withHeadRefName: false,
  pullRequestLimit: 5,
  historyLimit: 15,
  useCommitishes: true,
}

describe('findCommitsInComparison', () => {
  beforeEach(() => {
    localMocks.compareCommitsWithBasehead.mockReset()
    localMocks.graphql.mockReset()
  })

  it('hydrates the exact REST comparison set regardless of history order', async () => {
    localMocks.compareCommitsWithBasehead
      .mockResolvedValueOnce({
        data: { commits: [{ sha: 'head' }, { sha: 'side-branch' }] },
        headers: { link: '<next>; rel="next"' },
      })
      .mockResolvedValueOnce({
        data: { commits: [{ sha: 'middle' }] },
        headers: {},
      })
    localMocks.graphql
      .mockResolvedValueOnce(
        response([commit('head'), commit('base')], {
          hasNextPage: true,
          endCursor: 'next',
        }),
      )
      .mockResolvedValueOnce(
        response([commit('side-branch'), commit('middle')], {
          hasNextPage: false,
          endCursor: null,
        }),
      )

    const result = await findCommitsInComparison({
      ...params,
      github: github(),
    })

    expect(result.map(({ oid }) => oid)).toEqual([
      'head',
      'side-branch',
      'middle',
    ])
    expect(localMocks.compareCommitsWithBasehead).toHaveBeenNthCalledWith(1, {
      owner: 'octocat',
      repo: 'example',
      basehead: 'base...main',
      per_page: 100,
      page: 1,
    })
    expect(localMocks.compareCommitsWithBasehead).toHaveBeenNthCalledWith(2, {
      owner: 'octocat',
      repo: 'example',
      basehead: 'base...main',
      per_page: 100,
      page: 2,
    })
    expect(localMocks.graphql).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        baseCommitish: 'base',
        headCommitish: 'main^{commit}',
      }),
    )
    expect(localMocks.graphql).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ cursor: 'next' }),
    )
  })

  it('keeps ref comparison semantics for normal release ranges', async () => {
    localMocks.graphql.mockResolvedValue({
      repository: {
        ref: {
          compare: {
            commits: {
              nodes: [commit('ahead-of-merge-base')],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      },
    })

    const result = await findCommitsInComparison({
      github: github(),
      ...params,
      useCommitishes: false,
    })

    expect(result.map(({ oid }) => oid)).toEqual(['ahead-of-merge-base'])
    expect(localMocks.compareCommitsWithBasehead).not.toHaveBeenCalled()
    expect(localMocks.graphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        baseCommitish: 'base',
        headCommitish: 'main',
        useCommitishes: false,
      }),
    )
  })

  it('returns no commits when the REST comparison is empty', async () => {
    localMocks.compareCommitsWithBasehead.mockResolvedValue({
      data: { commits: [] },
      headers: {},
    })

    await expect(
      findCommitsInComparison({ ...params, github: github() }),
    ).resolves.toEqual([])
    expect(localMocks.graphql).not.toHaveBeenCalled()
  })

  it('rejects comparison commits missing from the target history', async () => {
    localMocks.compareCommitsWithBasehead.mockResolvedValue({
      data: { commits: [{ sha: 'head' }, { sha: 'missing' }] },
      headers: {},
    })
    localMocks.graphql.mockResolvedValue(
      response([commit('head')], {
        hasNextPage: false,
        endCursor: null,
      }),
    )

    await expect(
      findCommitsInComparison({ ...params, github: github() }),
    ).rejects.toThrow(
      'Comparison commits were not found in the history of main: missing',
    )
  })
})
