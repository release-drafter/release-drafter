import {
  filterPullRequestsByPreCategories as filterCorePullRequestsByPreCategories,
  matchesCategoryCondition as matchesCoreCategoryCondition,
  type PullRequestLike,
} from '@release-drafter/core'

export * from '@release-drafter/core'

type LegacyPullRequestLike = Omit<PullRequestLike, 'labels'> & {
  labels?:
    | string[]
    | { nodes?: ({ name?: string | null } | null)[] | null }
    | null
}

const normalizePullRequest = <Pr extends LegacyPullRequestLike>(
  pullRequest: Pr,
): Omit<Pr, 'labels'> & PullRequestLike => ({
  ...pullRequest,
  labels: Array.isArray(pullRequest.labels)
    ? pullRequest.labels
    : (pullRequest.labels?.nodes ?? [])
        .map((label) => label?.name)
        .filter((name): name is string => Boolean(name)),
})

export const matchesCategoryCondition = (
  condition: Parameters<typeof matchesCoreCategoryCondition>[0],
  pullRequest: LegacyPullRequestLike,
) => matchesCoreCategoryCondition(condition, normalizePullRequest(pullRequest))

export const filterPullRequestsByPreCategories = <
  Pr extends LegacyPullRequestLike,
>(
  pullRequests: Pr[],
  categories: Parameters<typeof filterCorePullRequestsByPreCategories>[1],
): Pr[] => {
  const normalizedPullRequests = pullRequests.map(normalizePullRequest)
  const included = new Set(
    filterCorePullRequestsByPreCategories(normalizedPullRequests, categories),
  )
  return pullRequests.filter((_, index) =>
    included.has(normalizedPullRequests[index]),
  )
}
