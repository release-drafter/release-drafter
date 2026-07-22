import * as core from '@actions/core'
import { context } from '@actions/github'
import { executeGraphql, getOctokit } from '#src/common/index.ts'
import {
  FindRecentMergedPullRequestsDocument,
  type FindRecentMergedPullRequestsQuery,
} from '#src/types/github.graphql.generated.ts'

export type PullRequestFieldFlags = {
  withPullRequestBody: boolean
  withPullRequestURL: boolean
  withBaseRefName: boolean
  withHeadRefName: boolean
}

const RECENT_PR_LOOKBACK = 5

type RecentMergedPullRequestNode = NonNullable<
  NonNullable<
    FindRecentMergedPullRequestsQuery['repository']
  >['pullRequests']['nodes']
>[number]

export type RecentMergedPullRequest = NonNullable<RecentMergedPullRequestNode>

export const findRecentMergedPullRequests = async (params: {
  baseRefName: string | null
  commitOids: Set<string>
  foundPrKeys: Set<string>
  fieldFlags: PullRequestFieldFlags
}): Promise<RecentMergedPullRequest[]> => {
  const octokit = getOctokit()
  const nameWithOwner = `${context.repo.owner}/${context.repo.repo}`

  const data = await executeGraphql(
    octokit.graphql,
    FindRecentMergedPullRequestsDocument,
    {
      name: context.repo.repo,
      owner: context.repo.owner,
      baseRefName: params.baseRefName,
      limit: RECENT_PR_LOOKBACK,
      ...params.fieldFlags,
    },
  )

  const prNodes = data.repository?.pullRequests.nodes ?? []

  const missingPRs = prNodes.filter((pr) => {
    if (!pr?.mergeCommit?.oid) return false
    const prKey = `${nameWithOwner}#${pr.number}`
    return (
      params.commitOids.has(pr.mergeCommit.oid) &&
      !params.foundPrKeys.has(prKey)
    )
  })

  if (missingPRs.length === 0) return []

  core.info(
    `Found ${missingPRs.length} recently merged PR(s) missing from GraphQL index, recovering: ${missingPRs.map((pr) => `#${pr?.number}`).join(', ')}`,
  )

  return missingPRs.filter((pr): pr is RecentMergedPullRequest => pr != null)
}
