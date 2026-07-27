import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCommitsInComparisonRest } from '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison-rest.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { testGitHubContext } from '#tests/mocks/index.ts'

/**
 * Covers how the REST path narrows "which pull requests merged into this range".
 *
 * Scanning every closed pull request is what made the naive port transfer tens of
 * megabytes, so the search is bounded by asking the server for pull requests
 * updated since the range began. These tests pin that the bound is requested, that
 * it cannot drop a pull request whose page ordering is unhelpful, and that
 * unmerged candidates cost nothing.
 */

const OLDEST = '2026-06-01T00:00:00Z'
const NEWEST = '2026-06-02T00:00:00Z'

const comparison = {
  url: 'https://api.github.com/repos/octocat/example/compare/base...main',
  commits: [
    {
      sha: 'merge-early',
      commit: {
        message: 'feat: early (#1)',
        committer: { date: OLDEST },
        author: { name: 'The Octocat', date: OLDEST },
      },
      author: { login: 'octocat' },
    },
    {
      sha: 'merge-late',
      commit: {
        message: 'feat: late (#2)',
        committer: { date: NEWEST },
        author: { name: 'The Octocat', date: NEWEST },
      },
      author: { login: 'octocat' },
    },
  ],
}

const issue = (number: number, mergedAt: string | null) => ({
  number,
  pull_request: { merged_at: mergedAt },
})

const detail = (number: number, mergeCommitSha: string) => ({
  number,
  title: `PR ${number}`,
  body: '',
  html_url: `https://github.com/octocat/example/pull/${number}`,
  merged_at: OLDEST,
  merge_commit_sha: mergeCommitSha,
  user: { login: 'octocat', html_url: 'https://github.com/octocat' },
  labels: [],
  base: { ref: 'main', repo: { full_name: 'octocat/example' } },
  head: { ref: 'feature', repo: { full_name: 'octocat/example' } },
})

const localMocks = vi.hoisted(() => ({
  paginate: vi.fn(),
  pullsGet: vi.fn(),
}))

const github = (issues: ReturnType<typeof issue>[]) => {
  const { octokit } = testGitHubContext()
  const { rest } = octokit
  const issueQueries: Array<Record<string, unknown>> = []

  localMocks.paginate.mockImplementation(
    async (
      route: unknown,
      options: Record<string, unknown>,
      mapPage?: (response: { data: unknown }) => unknown,
    ) => {
      if (route === rest.repos.compareCommitsWithBasehead) {
        return mapPage?.({ data: comparison })
      }
      if (route === 'GET /repos/{owner}/{repo}/issues') {
        issueQueries.push(options)
        return issues
      }
      throw new Error(`unexpected paginated route: ${String(route)}`)
    },
  )

  return {
    issueQueries,
    context: testGitHubContext({
      octokit: {
        ...octokit,
        paginate: localMocks.paginate as unknown as Octokit['paginate'],
        rest: {
          ...rest,
          pulls: { ...rest.pulls, get: localMocks.pullsGet },
        },
      } as never,
    }),
  }
}

const params = {
  owner: 'octocat',
  name: 'example',
  baseCommitish: 'base',
  headCommitish: 'main',
  withPullRequestBody: false,
  withPullRequestURL: false,
  withBaseRefName: false,
  withHeadRefName: false,
  withCommitAuthors: false,
}

const associatedNumbers = (
  commits: Awaited<ReturnType<typeof findCommitsInComparisonRest>>,
) =>
  commits
    .flatMap((commit) => commit.associatedPullRequests?.nodes ?? [])
    .map((node) => node?.number)
    .sort((a, b) => (a ?? 0) - (b ?? 0))

describe('findCommitsInComparisonRest pull request lookup', () => {
  beforeEach(() => {
    localMocks.paginate.mockReset()
    localMocks.pullsGet.mockReset()
  })

  it('bounds the search server-side by the oldest commit in range', async () => {
    const { issueQueries, context } = github([])

    await findCommitsInComparisonRest({ ...params, github: context })

    // `since` is what keeps this off the full closed-pull-request history, and it
    // is sound because a pull request merged into the range cannot predate it.
    expect(issueQueries).toHaveLength(1)
    expect(issueQueries[0]).toMatchObject({ since: OLDEST, state: 'closed' })
  })

  it('finds every merged pull request regardless of the order returned', async () => {
    // The relevant pull request arrives last, behind unrelated ones. Nothing may
    // stop the search early on the strength of the order.
    localMocks.pullsGet.mockImplementation(
      async ({ pull_number }: { pull_number: number }) => ({
        data: detail(
          pull_number,
          pull_number === 1
            ? 'merge-early'
            : pull_number === 2
              ? 'merge-late'
              : `unrelated-${pull_number}`,
        ),
      }),
    )
    const { context } = github([
      issue(1, OLDEST),
      issue(50, OLDEST),
      issue(51, OLDEST),
      issue(2, NEWEST),
    ])

    const commits = await findCommitsInComparisonRest({
      ...params,
      github: context,
    })

    expect(associatedNumbers(commits)).toEqual([1, 2])
  })

  it('does not fetch details for candidates that never merged', async () => {
    localMocks.pullsGet.mockResolvedValue({ data: detail(1, 'merge-early') })
    const { context } = github([issue(1, OLDEST), issue(99, null)])

    await findCommitsInComparisonRest({ ...params, github: context })

    expect(localMocks.pullsGet).toHaveBeenCalledTimes(1)
    expect(localMocks.pullsGet).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 1 }),
    )
  })
})
