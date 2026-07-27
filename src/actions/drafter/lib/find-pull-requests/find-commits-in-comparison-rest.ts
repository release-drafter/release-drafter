import type { GitHubContext } from '#src/common/index.ts'
import type { findCommitsInComparison } from './find-commits-in-comparison.ts'

type ComparisonCommit = Awaited<
  ReturnType<typeof findCommitsInComparison>
>[number]

/**
 * REST-only replacement for the `findCommitsInComparison` GraphQL query, for
 * forges that expose GitHub's REST surface but no GraphQL API (Gitea, Forgejo).
 *
 * GraphQL resolves `commit -> associatedPullRequests` directly. REST has no such
 * route on these forges (`/repos/{o}/{r}/commits/{sha}/pulls` is GitHub-only), so
 * the association is inverted: list the merged pull requests and index them by
 * `merge_commit_sha`, then attach each to the matching commit in the comparison.
 */

type ComparisonPage = {
  commits: Array<{
    sha: string
    commit: {
      message: string
      committer?: { date?: string } | null
      author?: { name?: string; date?: string } | null
    }
    author?: { login?: string } | null
  }>
}

type PullRequestListItem = Awaited<
  ReturnType<GitHubContext['octokit']['rest']['pulls']['list']>
>['data'][number]

/**
 * Walks closed pull requests newest-first, keeping only those whose merge commit
 * is in the comparison, and stops as soon as it can prove no later page can
 * contribute.
 *
 * Listing every closed pull request is what makes the naive REST port
 * pathological: on a repository with thousands of them it transfers tens of
 * megabytes to use a handful of records. Two independent stop conditions bound
 * it — every comparison commit has been matched, or a whole page predates the
 * oldest commit under consideration. The date check is the load-bearing one,
 * since most comparison commits are not merge commits and so never match.
 */
const findPullRequestsForMergeCommits = async (params: {
  octokit: GitHubContext['octokit']
  owner: string
  repo: string
  commitShas: Set<string>
  oldestCommitDate?: string
}) => {
  const { octokit, owner, repo, commitShas, oldestCommitDate } = params
  const matched = new Map<string, PullRequestListItem>()
  const remaining = new Set(commitShas)

  const pages = octokit.paginate.iterator(octokit.rest.pulls.list, {
    owner,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  })

  for await (const page of pages) {
    for (const pullRequest of page.data) {
      if (!pullRequest.merged_at || !pullRequest.merge_commit_sha) continue
      if (remaining.delete(pullRequest.merge_commit_sha)) {
        matched.set(pullRequest.merge_commit_sha, pullRequest)
      }
    }

    if (remaining.size === 0) break

    // `sort: updated` is a hint, not a guarantee on every forge, so only stop
    // when the entire page is older than the oldest commit in range.
    if (
      oldestCommitDate &&
      page.data.length > 0 &&
      page.data.every(
        (pullRequest) => (pullRequest.updated_at ?? '') < oldestCommitDate,
      )
    ) {
      break
    }
  }

  return matched
}

/**
 * Collects the accounts credited on each pull request, keyed by pull request
 * number.
 *
 * A squash merge collapses its branch into one commit whose extra authors survive
 * only as `Co-authored-by:` trailers. GitHub's GraphQL `Commit.authors` resolves
 * those trailer addresses to accounts through a mapping no REST route exposes —
 * `search/users?q=…in:email` misses any address its owner keeps private and, for
 * a domain that also backs an organisation, answers with the organisation
 * instead. So rather than resolving addresses at all, this reads the pull
 * request's own pre-squash commits, each of which already carries its resolved
 * `author`. That yields exactly the set GraphQL reports.
 *
 * Costs one request per pull request, hence the caller's `withCommitAuthors`
 * gate.
 */
const findPullRequestAuthorLogins = async (params: {
  octokit: GitHubContext['octokit']
  owner: string
  repo: string
  pullRequestNumbers: number[]
}) => {
  const { octokit, owner, repo } = params
  const entries = await Promise.all(
    params.pullRequestNumbers.map(async (pullNumber) => {
      const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      })

      // Keyed by login so repeated commits by one person collapse; insertion
      // order is kept so attribution follows the branch's commit order.
      const byLogin = new Map<string, string | null>()
      for (const commit of commits) {
        const login = commit.author?.login
        if (login && !byLogin.has(login)) {
          byLogin.set(login, commit.commit.author?.name ?? null)
        }
      }

      return [pullNumber, byLogin] as const
    }),
  )

  return new Map(entries)
}

export const findCommitsInComparisonRest = async (params: {
  owner: string
  name: string
  baseCommitish: string
  headCommitish: string
  withPullRequestBody: boolean
  withPullRequestURL: boolean
  withBaseRefName: boolean
  withHeadRefName: boolean
  /** Costs one request per pull request; see findPullRequestAuthorLogins. */
  withCommitAuthors: boolean
  github: Pick<GitHubContext, 'octokit'>
}): Promise<ComparisonCommit[]> => {
  const { octokit } = params.github
  const nameWithOwner = `${params.owner}/${params.name}`

  const comparison = await octokit.paginate(
    octokit.rest.repos.compareCommitsWithBasehead,
    {
      owner: params.owner,
      repo: params.name,
      basehead: `${params.baseCommitish}...${params.headCommitish}`,
      per_page: 100,
    },
    // Octokit's pagination plugin only unwraps this route's payload into a
    // bare commit list when the response carries a `url` key. GitHub sends
    // one, so the whole comparison object survives; Gitea and Forgejo omit
    // it, so the plugin has already unwrapped the page. Accept both.
    (response) => {
      const data = response.data as unknown as
        | ComparisonPage
        | ComparisonPage['commits']

      return Array.isArray(data) ? data : data.commits
    },
  )

  const commitDates = comparison.flatMap((commit) => {
    const date = commit.commit.committer?.date ?? commit.commit.author?.date
    return date ? [date] : []
  })
  const pullRequestsByMergeCommit = await findPullRequestsForMergeCommits({
    octokit,
    owner: params.owner,
    repo: params.name,
    commitShas: new Set(comparison.map((commit) => commit.sha)),
    oldestCommitDate:
      commitDates.length > 0
        ? commitDates.reduce((a, b) => (a < b ? a : b))
        : undefined,
  })

  const authorLoginsByPullRequest = params.withCommitAuthors
    ? await findPullRequestAuthorLogins({
        octokit,
        owner: params.owner,
        repo: params.name,
        pullRequestNumbers: [...pullRequestsByMergeCommit.values()].map(
          (pullRequest) => pullRequest.number,
        ),
      })
    : new Map()

  return comparison.map((commit) => {
    const pullRequest = pullRequestsByMergeCommit.get(commit.sha)
    const login = commit.author?.login
    const pullRequestAuthors = pullRequest
      ? authorLoginsByPullRequest.get(pullRequest.number)
      : undefined

    return {
      __typename: 'Commit' as const,
      id: commit.sha,
      oid: commit.sha,
      committedDate:
        commit.commit.committer?.date ?? commit.commit.author?.date ?? '',
      message: commit.commit.message,
      author: {
        __typename: 'GitActor' as const,
        name: commit.commit.author?.name ?? null,
        user: login ? { __typename: 'User' as const, login } : null,
      },
      // For a merge commit this is the pull request's full author set, recovered
      // from its own commits; otherwise it is just this commit's own author. Only
      // accounts REST resolved to a login are reported — an unresolvable address
      // could be surfaced only by raw git name, which would duplicate the author
      // under a second spelling and degrade `@mention`s to plain text.
      authors: {
        __typename: 'GitActorConnection' as const,
        nodes: [
          ...(pullRequestAuthors
            ? [...pullRequestAuthors].map(([authorLogin, authorName]) => ({
                __typename: 'GitActor' as const,
                name: authorName,
                user: { __typename: 'User' as const, login: authorLogin },
              }))
            : login
              ? [
                  {
                    __typename: 'GitActor' as const,
                    name: commit.commit.author?.name ?? null,
                    user: { __typename: 'User' as const, login },
                  },
                ]
              : []),
        ],
      },
      associatedPullRequests: {
        __typename: 'PullRequestConnection' as const,
        nodes: pullRequest
          ? [
              {
                __typename: 'PullRequest' as const,
                title: pullRequest.title,
                number: pullRequest.number,
                ...(params.withPullRequestURL
                  ? { url: pullRequest.html_url }
                  : {}),
                ...(params.withPullRequestBody
                  ? { body: pullRequest.body ?? '' }
                  : {}),
                author: pullRequest.user
                  ? {
                      __typename: 'User' as const,
                      login: pullRequest.user.login,
                      url: pullRequest.user.html_url,
                    }
                  : null,
                baseRepository: {
                  __typename: 'Repository' as const,
                  nameWithOwner,
                },
                mergedAt: pullRequest.merged_at,
                isCrossRepository:
                  pullRequest.head?.repo?.full_name !==
                  pullRequest.base?.repo?.full_name,
                labels: {
                  __typename: 'LabelConnection' as const,
                  nodes: (pullRequest.labels ?? []).map((label) => ({
                    __typename: 'Label' as const,
                    name: typeof label === 'string' ? label : label.name,
                  })),
                },
                merged: true,
                ...(params.withBaseRefName
                  ? { baseRefName: pullRequest.base?.ref }
                  : {}),
                ...(params.withHeadRefName
                  ? { headRefName: pullRequest.head?.ref }
                  : {}),
              },
            ]
          : [],
      },
    }
  })
}
