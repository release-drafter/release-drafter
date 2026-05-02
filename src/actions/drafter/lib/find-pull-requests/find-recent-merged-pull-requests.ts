import * as core from '@actions/core'
import { context } from '@actions/github'
import { print } from 'graphql'
import { getOctokit } from 'src/common'
import type { findCommitsInComparison } from './find-commits-in-comparison'
import type { FindRecentMergedPullRequestsQuery } from './graphql/find-recent-merged-pull-requests.graphql.generated'
import { FindRecentMergedPullRequestsDocument } from './graphql/find-recent-merged-pull-requests.graphql.generated'

type CommitNode = Awaited<ReturnType<typeof findCommitsInComparison>>[number]

export type GraphqlPullRequest = NonNullable<
  NonNullable<CommitNode['associatedPullRequests']>['nodes']
>[number]

const RECENT_PR_LOOKBACK = 5

/**
 * Fetches the most recently merged PRs directly from the PR table via GraphQL
 * and returns any whose mergeCommit.oid is in the comparison but were not found
 * via commit.associatedPullRequests (which uses a separate index that can lag
 * for very recently merged PRs).
 */
export const findRecentMergedPullRequests = async (params: {
  commitOids: Set<string>
  foundPrKeys: Set<string>
  withPullRequestBody: boolean
  withPullRequestURL: boolean
  withBaseRefName: boolean
  withHeadRefName: boolean
}): Promise<NonNullable<GraphqlPullRequest>[]> => {
  const octokit = getOctokit()
  const nameWithOwner = `${context.repo.owner}/${context.repo.repo}`

  const data = await octokit.graphql<FindRecentMergedPullRequestsQuery>(
    print(FindRecentMergedPullRequestsDocument),
    {
      name: context.repo.repo,
      owner: context.repo.owner,
      limit: RECENT_PR_LOOKBACK,
      withPullRequestBody: params.withPullRequestBody,
      withPullRequestURL: params.withPullRequestURL,
      withBaseRefName: params.withBaseRefName,
      withHeadRefName: params.withHeadRefName,
    },
  )

  const prNodes = data.repository?.pullRequests.nodes ?? []

  const missingPRs = prNodes.filter(
    (pr): pr is NonNullable<typeof pr> & { mergeCommit: { oid: string } } => {
      if (!pr?.mergeCommit?.oid) return false
      const prKey = `${nameWithOwner}#${pr.number}`
      return (
        params.commitOids.has(pr.mergeCommit.oid) &&
        !params.foundPrKeys.has(prKey)
      )
    },
  )

  if (missingPRs.length === 0) return []

  core.info(
    `Found ${missingPRs.length} recently merged PR(s) missing from GraphQL index, recovering: ${missingPRs.map((pr) => `#${pr.number}`).join(', ')}`,
  )

  return missingPRs as unknown as NonNullable<GraphqlPullRequest>[]
}
