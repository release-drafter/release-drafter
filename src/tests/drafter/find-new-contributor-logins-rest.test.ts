import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findNewContributorLoginsRest } from '#src/actions/drafter/lib/find-pull-requests/find-new-contributor-logins-rest.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { testGitHubContext } from '#tests/mocks/index.ts'

/**
 * Unit coverage for the REST `$NEW_CONTRIBUTORS` lookup.
 *
 * The container suite exercises this against real Gitea and Forgejo servers, but
 * those runs are opt-in and report no coverage, so the decision logic is pinned
 * here: who counts as a candidate, and what makes a merge "earlier".
 */

const FIRST = '2026-06-02T00:00:00Z'
const EARLIER = '2026-01-01T00:00:00Z'

const candidate = (
  login: string,
  mergedAt: string | null,
  typename = 'User',
) => ({
  author: { __typename: typename, login },
  mergedAt,
})

const issue = (mergedAt: string | null) => ({
  pull_request: mergedAt ? { merged_at: mergedAt } : null,
})

const localMocks = vi.hoisted(() => ({ paginate: vi.fn() }))

const github = (byLogin: Record<string, ReturnType<typeof issue>[]>) => {
  const { octokit } = testGitHubContext()
  const queries: Array<Record<string, unknown>> = []

  localMocks.paginate.mockImplementation(
    async (route: unknown, options: Record<string, unknown>) => {
      if (route !== 'GET /repos/{owner}/{repo}/issues') {
        throw new Error(`unexpected route: ${String(route)}`)
      }
      queries.push(options)
      return byLogin[options.created_by as string] ?? []
    },
  )

  return {
    queries,
    github: {
      repo: { owner: 'octocat', repo: 'example' },
      octokit: {
        ...octokit,
        paginate: localMocks.paginate as unknown as Octokit['paginate'],
      } as never,
    },
  }
}

describe('findNewContributorLoginsRest', () => {
  beforeEach(() => {
    localMocks.paginate.mockReset()
  })

  it('credits an author whose only merge is the one in range', async () => {
    const { github: context } = github({ newcomer: [issue(FIRST)] })

    await expect(
      findNewContributorLoginsRest({
        pullRequests: [candidate('newcomer', FIRST)],
        github: context,
      }),
    ).resolves.toEqual(new Set(['newcomer']))
  })

  it('does not credit an author who merged something earlier', async () => {
    const { github: context } = github({
      regular: [issue(EARLIER), issue(FIRST)],
    })

    await expect(
      findNewContributorLoginsRest({
        pullRequests: [candidate('regular', FIRST)],
        github: context,
      }),
    ).resolves.toEqual(new Set())
  })

  it('compares against the earliest merge in range, not the latest', async () => {
    // Two pull requests this release; the earlier one is the candidate, and the
    // author has nothing before it.
    const { github: context } = github({
      newcomer: [issue('2026-06-01T00:00:00Z'), issue(FIRST)],
    })

    await expect(
      findNewContributorLoginsRest({
        pullRequests: [
          candidate('newcomer', FIRST),
          candidate('newcomer', '2026-06-01T00:00:00Z'),
        ],
        github: context,
      }),
    ).resolves.toEqual(new Set(['newcomer']))
    // One author means one lookup, however many pull requests they had.
    expect(localMocks.paginate).toHaveBeenCalledTimes(1)
  })

  it('sends both author-filter spellings so either forge applies one', async () => {
    const { queries, github: context } = github({ newcomer: [issue(FIRST)] })

    await findNewContributorLoginsRest({
      pullRequests: [candidate('newcomer', FIRST)],
      github: context,
    })

    // GitHub honours `creator`, Gitea and Forgejo `created_by`.
    expect(queries[0]).toMatchObject({
      state: 'closed',
      creator: 'newcomer',
      created_by: 'newcomer',
    })
  })

  it('claims nothing when the author filter returned no merges', async () => {
    // An empty answer means the filter did not apply, since the author's own
    // in-range pull request would otherwise be there.
    const { github: context } = github({ newcomer: [] })

    await expect(
      findNewContributorLoginsRest({
        pullRequests: [candidate('newcomer', FIRST)],
        github: context,
      }),
    ).resolves.toEqual(new Set())
  })

  it('ignores unmerged history when deciding', async () => {
    const { github: context } = github({
      newcomer: [issue(null), issue(FIRST)],
    })

    await expect(
      findNewContributorLoginsRest({
        pullRequests: [candidate('newcomer', FIRST)],
        github: context,
      }),
    ).resolves.toEqual(new Set(['newcomer']))
  })

  it.each([
    ['a bot author', [candidate('renovate', FIRST, 'Bot')]],
    ['a missing author', [{ author: null, mergedAt: FIRST }]],
    ['an unmerged pull request', [candidate('newcomer', null)]],
  ])('skips %s without querying', async (_label, pullRequests) => {
    const { github: context } = github({})

    await expect(
      findNewContributorLoginsRest({ pullRequests, github: context }),
    ).resolves.toEqual(new Set())
    expect(localMocks.paginate).not.toHaveBeenCalled()
  })
})
