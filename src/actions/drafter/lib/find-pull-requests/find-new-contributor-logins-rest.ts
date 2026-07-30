import type { GitHubContext } from '#src/common/index.ts'

/**
 * REST-only replacement for the GraphQL `search`-based new contributor lookup.
 *
 * GraphQL answers "had this author merged anything here before?" with one aliased
 * `search` query covering every candidate. Gitea and Forgejo have no such
 * connection, but they do filter pull requests by author — `poster` on the pulls
 * route, `created_by` on the issues route — so the same question is answered per
 * author by listing their closed pull requests and looking for an earlier merge.
 *
 * Costs one request per candidate author, where GraphQL costs one in total, hence
 * the caller's `$NEW_CONTRIBUTORS` gate.
 */

type CandidatePullRequest = {
  author?: { __typename?: string; login: string } | null
  mergedAt?: string | null
}

type AuthoredIssue = { pull_request?: { merged_at?: string | null } | null }

export const findNewContributorLoginsRest = async (params: {
  pullRequests: CandidatePullRequest[]
  github: Pick<GitHubContext, 'octokit' | 'repo'>
}) => {
  const { octokit, repo } = params.github

  // Only the earliest merge per author matters: that is the release's candidate
  // for being their first contribution.
  const firstMergedAtByLogin = new Map<string, string>()
  for (const pullRequest of params.pullRequests) {
    if (pullRequest.author?.__typename !== 'User' || !pullRequest.mergedAt) {
      continue
    }

    const previous = firstMergedAtByLogin.get(pullRequest.author.login)
    if (!previous || pullRequest.mergedAt < previous) {
      firstMergedAtByLogin.set(pullRequest.author.login, pullRequest.mergedAt)
    }
  }

  if (firstMergedAtByLogin.size === 0) return new Set<string>()

  const results = await Promise.all(
    [...firstMergedAtByLogin].map(async ([login, mergedAt]) => {
      // The issues route is the only one both forges filter by author, and they
      // disagree on the name: GitHub wants `creator`, Gitea and Forgejo want
      // `created_by`. Each ignores the other's, so sending both serves either.
      // The pulls route is not usable here — its Gitea-only `poster` is silently
      // ignored by GitHub, which then returns every closed pull request.
      const authored = (await octokit.paginate(
        'GET /repos/{owner}/{repo}/issues',
        {
          owner: repo.owner,
          repo: repo.repo,
          state: 'closed',
          creator: login,
          created_by: login,
          limit: 100,
          per_page: 100,
        } as never,
      )) as AuthoredIssue[]

      const merges = authored.flatMap((item) =>
        item.pull_request?.merged_at ? [item.pull_request.merged_at] : [],
      )

      // Their own in-range pull request should always be here. Nothing at all
      // means the author filter did not apply, so claim nothing rather than
      // crediting a first contribution that may not be one.
      if (merges.length === 0) return { login, isNew: false }

      const hadEarlierMerge = merges.some(
        (earlierMergedAt) => earlierMergedAt < mergedAt,
      )

      return { login, isNew: !hadEarlierMerge }
    }),
  )

  return new Set(results.flatMap(({ login, isNew }) => (isNew ? [login] : [])))
}
