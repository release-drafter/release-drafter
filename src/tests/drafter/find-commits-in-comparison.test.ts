import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCommitsInComparison } from '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts'

const localMocks = vi.hoisted(() => ({
  graphql: vi.fn(),
}))

vi.mock('#src/common/get-octokit.ts', () => ({
  getOctokit: () => ({ graphql: localMocks.graphql }),
}))

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
    base: { __typename: 'Commit', oid: 'base' },
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
    localMocks.graphql.mockReset()
  })

  it('resolves commitishes and walks history to the base commit', async () => {
    localMocks.graphql
      .mockResolvedValueOnce(
        response([commit('head'), commit('middle')], {
          hasNextPage: true,
          endCursor: 'next',
        }),
      )
      .mockResolvedValueOnce(
        response([commit('base')], {
          hasNextPage: false,
          endCursor: null,
        }),
      )

    const result = await findCommitsInComparison(params)

    expect(result.map(({ oid }) => oid)).toEqual(['head', 'middle'])
    expect(localMocks.graphql).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        baseCommitish: 'base^{commit}',
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
      ...params,
      useCommitishes: false,
    })

    expect(result.map(({ oid }) => oid)).toEqual(['ahead-of-merge-base'])
    expect(localMocks.graphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        baseCommitish: 'base',
        headCommitish: 'main',
        useCommitishes: false,
      }),
    )
  })

  it('rejects a base commitish outside the target history', async () => {
    localMocks.graphql.mockResolvedValue(
      response([commit('head')], {
        hasNextPage: false,
        endCursor: null,
      }),
    )

    await expect(findCommitsInComparison(params)).rejects.toThrow(
      'Base commitish base is not an ancestor of main',
    )
  })
})
