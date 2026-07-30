import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCommitsInComparison } from '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { testGitHubContext } from '#tests/mocks/index.ts'

const localMocks = vi.hoisted(() => ({
  paginate: vi.fn(),
  graphqlIterator: vi.fn(),
}))

/**
 * Pagination itself belongs to Octokit's plugins, so only the entry points they
 * provide are stubbed; the assertions stay on which pages this module consumes
 * and what it selects out of them.
 */
const github = () => {
  const octokit = testGitHubContext().octokit
  const graphql = Object.assign(vi.fn(), {
    paginate: Object.assign(vi.fn(), { iterator: localMocks.graphqlIterator }),
  })

  return testGitHubContext({
    octokit: {
      ...octokit,
      paginate: localMocks.paginate as unknown as Octokit['paginate'],
      graphql,
    } as never,
  })
}

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

const historyPage = (oids: string[], hasNextPage = false) => ({
  repository: {
    head: {
      __typename: 'Commit',
      history: {
        nodes: oids.map(commit),
        pageInfo: { hasNextPage, endCursor: hasNextPage ? 'next' : null },
      },
    },
  },
})

const comparePage = (oids: string[]) => ({
  repository: {
    ref: {
      compare: {
        commits: {
          nodes: oids.map(commit),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    },
  },
})

/**
 * Yields the given pages and records how many were actually pulled, so early
 * termination can be asserted rather than inferred.
 */
const pagesOf = <T>(...values: T[]) => {
  const consumed: T[] = []
  localMocks.graphqlIterator.mockReturnValue({
    async *[Symbol.asyncIterator]() {
      for (const value of values) {
        consumed.push(value)
        yield value
      }
    },
  })
  return consumed
}

/** `findComparisonCommitOids` maps each page by `.sha`. */
const compared = (...shas: string[]) => shas.map((sha) => ({ sha }))

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
    localMocks.paginate.mockReset()
    localMocks.graphqlIterator.mockReset()
  })

  it('hydrates the exact comparison set regardless of history order', async () => {
    localMocks.paginate.mockResolvedValue(
      compared('head', 'side-branch', 'middle'),
    )
    pagesOf(
      historyPage(['head', 'base'], true),
      historyPage(['side-branch', 'middle']),
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
    expect(localMocks.graphqlIterator).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        baseCommitish: 'base',
        headCommitish: 'main^{commit}',
      }),
    )
  })

  it('resolves the comparison range through REST pagination', async () => {
    localMocks.paginate.mockResolvedValue(compared('head'))
    pagesOf(historyPage(['head']))

    await findCommitsInComparison({ ...params, github: github() })

    expect(localMocks.paginate).toHaveBeenCalledWith(
      expect.anything(),
      {
        owner: 'octocat',
        repo: 'example',
        basehead: 'base...main',
        per_page: 100,
      },
      expect.any(Function),
    )
  })

  it('selects the commits out of each comparison page', async () => {
    localMocks.paginate.mockResolvedValue([])

    await findCommitsInComparison({ ...params, github: github() })

    const selectCommits = localMocks.paginate.mock.calls[0][2]
    expect(
      selectCommits({ data: { commits: [{ sha: 'a' }, { sha: 'b' }] } }),
    ).toEqual([{ sha: 'a' }, { sha: 'b' }])
  })

  it('stops paginating history once the comparison set is hydrated', async () => {
    localMocks.paginate.mockResolvedValue(compared('head'))
    const consumed = pagesOf(
      historyPage(['head'], true),
      historyPage(['older-commit']),
    )

    const result = await findCommitsInComparison({
      ...params,
      github: github(),
    })

    expect(result.map(({ oid }) => oid)).toEqual(['head'])
    expect(consumed).toHaveLength(1)
  })

  it('keeps ref comparison semantics for normal release ranges', async () => {
    pagesOf(comparePage(['ahead-of-merge-base']))

    const result = await findCommitsInComparison({
      ...params,
      github: github(),
      useCommitishes: false,
    })

    expect(result.map(({ oid }) => oid)).toEqual(['ahead-of-merge-base'])
    expect(localMocks.paginate).not.toHaveBeenCalled()
    expect(localMocks.graphqlIterator).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        baseCommitish: 'base',
        headCommitish: 'main',
        useCommitishes: false,
      }),
    )
  })

  it('returns no commits when the comparison is empty', async () => {
    localMocks.paginate.mockResolvedValue([])

    await expect(
      findCommitsInComparison({ ...params, github: github() }),
    ).resolves.toEqual([])
    expect(localMocks.graphqlIterator).not.toHaveBeenCalled()
  })

  it('rejects comparison commits missing from the target history', async () => {
    localMocks.paginate.mockResolvedValue(compared('head', 'missing'))
    pagesOf(historyPage(['head']))

    await expect(
      findCommitsInComparison({ ...params, github: github() }),
    ).rejects.toThrow(
      'Comparison commits were not found in the history of main: missing',
    )
  })

  it('rejects a head commitish that does not resolve to a commit', async () => {
    localMocks.paginate.mockResolvedValue(compared('head'))
    pagesOf({ repository: { head: { __typename: 'Tree' } } })

    await expect(
      findCommitsInComparison({ ...params, github: github() }),
    ).rejects.toThrow('Head commitish could not be resolved to a commit')
  })
})
