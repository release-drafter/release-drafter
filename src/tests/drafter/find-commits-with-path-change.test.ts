import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCommitsWithPathChange } from '#src/actions/drafter/lib/find-pull-requests/find-commits-with-path-change.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { mockContext } from '../mocks/index.ts'

const makeHistoryPage = (
  ids: string[],
  hasNextPage: boolean,
  endCursor = 'cursor1',
) => ({
  repository: {
    object: {
      __typename: 'Commit',
      history: {
        __typename: 'CommitHistoryConnection',
        pageInfo: { __typename: 'PageInfo', hasNextPage, endCursor },
        nodes: ids.map((id) => ({ __typename: 'Commit', id })),
      },
    },
  },
})

const localMocks = vi.hoisted(() => ({
  graphql: vi.fn(),
}))

vi.mock(import('#src/common/get-octokit.ts'), async (iom) => {
  const om = await iom()
  process.env.GITHUB_TOKEN = 'test'
  return {
    ...om,
    getOctokit: () => ({
      ...om.getOctokit(),
      graphql: localMocks.graphql as unknown as Octokit['graphql'],
    }),
  }
})

const baseParams = {
  name: 'repo',
  owner: 'owner',
  targetCommitish: 'refs/heads/main',
}

describe('findCommitsWithPathChange', () => {
  beforeEach(async () => {
    await mockContext('push')
    localMocks.graphql.mockReset()
  })

  it('returns commits in the comparison set that match the path', async () => {
    const comparisonCommitIds = new Set(['id-1', 'id-2', 'id-3'])
    localMocks.graphql.mockResolvedValueOnce(
      makeHistoryPage(['id-1', 'id-2'], false),
    )

    const { commitIdsMatchingPaths, hasFoundCommits } =
      await findCommitsWithPathChange(['src/'], {
        ...baseParams,
        comparisonCommitIds,
      })

    expect(hasFoundCommits).toBe(true)
    expect(commitIdsMatchingPaths['src/']).toEqual(new Set(['id-1', 'id-2']))
    expect(localMocks.graphql).toHaveBeenCalledTimes(1)
  })

  it('filters out commits not in the comparison set', async () => {
    const comparisonCommitIds = new Set(['id-1'])
    // History returns id-1 (in range) and id-old (before base ref, not in set)
    localMocks.graphql.mockResolvedValueOnce(
      makeHistoryPage(['id-1', 'id-old'], false),
    )

    const { commitIdsMatchingPaths } = await findCommitsWithPathChange(
      ['src/'],
      { ...baseParams, comparisonCommitIds },
    )

    expect(commitIdsMatchingPaths['src/']).toEqual(new Set(['id-1']))
  })

  it('stops paginating when a page has no commits in the comparison set', async () => {
    const comparisonCommitIds = new Set(['id-1', 'id-2'])
    localMocks.graphql
      .mockResolvedValueOnce(makeHistoryPage(['id-1', 'id-2'], true, 'cur1'))
      // Second page has commits older than the base ref — none in comparison set
      .mockResolvedValueOnce(makeHistoryPage(['id-old-1', 'id-old-2'], true))

    await findCommitsWithPathChange(['src/'], {
      ...baseParams,
      comparisonCommitIds,
    })

    // Should stop after page 2 since no matches were found on it
    expect(localMocks.graphql).toHaveBeenCalledTimes(2)
  })

  it('continues paginating across pages that have matches', async () => {
    const comparisonCommitIds = new Set(['id-1', 'id-2', 'id-3'])
    localMocks.graphql
      .mockResolvedValueOnce(makeHistoryPage(['id-1'], true, 'cur1'))
      .mockResolvedValueOnce(makeHistoryPage(['id-2', 'id-3'], true, 'cur2'))
      // Third page: no matches, stop
      .mockResolvedValueOnce(makeHistoryPage(['id-old'], true))

    const { commitIdsMatchingPaths } = await findCommitsWithPathChange(
      ['src/'],
      { ...baseParams, comparisonCommitIds },
    )

    expect(commitIdsMatchingPaths['src/']).toEqual(
      new Set(['id-1', 'id-2', 'id-3']),
    )
    expect(localMocks.graphql).toHaveBeenCalledTimes(3)
  })

  it('handles multiple paths independently', async () => {
    const comparisonCommitIds = new Set(['id-1', 'id-2'])
    localMocks.graphql
      .mockResolvedValueOnce(makeHistoryPage(['id-1'], false)) // src/ query
      .mockResolvedValueOnce(makeHistoryPage(['id-2'], false)) // docs/ query

    const { commitIdsMatchingPaths } = await findCommitsWithPathChange(
      ['src/', 'docs/'],
      { ...baseParams, comparisonCommitIds },
    )

    expect(commitIdsMatchingPaths['src/']).toEqual(new Set(['id-1']))
    expect(commitIdsMatchingPaths['docs/']).toEqual(new Set(['id-2']))
    expect(localMocks.graphql).toHaveBeenCalledTimes(2)
  })

  it('returns hasFoundCommits false when no path-matched commits are in the comparison set', async () => {
    const comparisonCommitIds = new Set(['id-new'])
    // History returns only commits outside the comparison range
    localMocks.graphql.mockResolvedValueOnce(
      makeHistoryPage(['id-old-1', 'id-old-2'], false),
    )

    const { hasFoundCommits, commitIdsMatchingPaths } =
      await findCommitsWithPathChange(['src/'], {
        ...baseParams,
        comparisonCommitIds,
      })

    expect(hasFoundCommits).toBe(false)
    expect(commitIdsMatchingPaths['src/']).toEqual(new Set())
  })

  it('stops at end of history even with no matches page', async () => {
    const comparisonCommitIds = new Set(['id-1'])
    localMocks.graphql
      .mockResolvedValueOnce(makeHistoryPage(['id-1'], true, 'cur1'))
      // hasNextPage: false → stops even though there were matches last page
      .mockResolvedValueOnce(makeHistoryPage([], false))

    const { commitIdsMatchingPaths } = await findCommitsWithPathChange(
      ['src/'],
      { ...baseParams, comparisonCommitIds },
    )

    expect(commitIdsMatchingPaths['src/']).toEqual(new Set(['id-1']))
    expect(localMocks.graphql).toHaveBeenCalledTimes(2)
  })
})
