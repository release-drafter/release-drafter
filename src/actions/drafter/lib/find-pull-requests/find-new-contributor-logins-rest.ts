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

type AuthoredPullRequest = { merged_at?: string | null }

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
      const authored = (await octokit.paginate(
        'GET /repos/{owner}/{repo}/pulls',
        {
          owner: repo.owner,
          repo: repo.repo,
          state: 'closed',
          // `poster` is the Gitea and Forgejo author filter and `limit` their
          // page-size name; both forges ignore `per_page`'s absence and GitHub
          // ignores the extra keys, so one shape serves either.
          poster: login,
          limit: 100,
          per_page: 100,
        } as never,
      )) as AuthoredPullRequest[]

      // A filter naming an account that does not exist fails open on these
      // forges and returns every pull request, so an author with no matches at
      // all is treated as unproven rather than new.
      if (authored.length === 0) return { login, isNew: false }

      const hadEarlierMerge = authored.some(
        (pullRequest) =>
          pullRequest.merged_at && pullRequest.merged_at < mergedAt,
      )

      return { login, isNew: !hadEarlierMerge }
    }),
  )

  return new Set(results.flatMap(({ login, isNew }) => (isNew ? [login] : [])))
}
