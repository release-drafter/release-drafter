import * as core from '@actions/core'
import { context } from '@actions/github'
import { executeGraphql, getOctokit } from '#src/common/index.ts'
import {
  FindRecentMergedPullRequestsDocument,
  type FindRecentMergedPullRequestsQuery,
} from './graphql/find-recent-merged-pull-requests.graphql.generated.ts'

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
  const nameWithOwner = `${context.repo.owner}/${context.repo.repo}`

  const prNodes = await queryRecentMergedPullRequests({
    baseRefName: params.baseRefName,
    fieldFlags: params.fieldFlags,
  })

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

/**
 * Collect the most recently merged pull requests targeting this repository.
 *
 * Used on a first release (no published release or tag) where there is no
 * comparison baseline to derive changes from. Without a baseline the draft
 * would otherwise carry no PRs and no labels, so its version always resolved
 * to the no-change default. Scanning the recent merged PRs lets their labels
 * drive categorisation and the version-resolver increment instead.
 */
export const findRecentMergedPullRequestsWithoutBaseline = async (params: {
  baseRefName: string | null
  fieldFlags: PullRequestFieldFlags
}): Promise<RecentMergedPullRequest[]> => {
  const prNodes = await queryRecentMergedPullRequests({
    baseRefName: params.baseRefName,
    fieldFlags: params.fieldFlags,
  })

  const pullRequests = prNodes.filter(
    (pr): pr is RecentMergedPullRequest => pr != null,
  )

  if (pullRequests.length === 0) return []

  core.info(
    `No comparison baseline; scanning the ${pullRequests.length} most recently merged PR(s): ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`,
  )

  return pullRequests
}

const queryRecentMergedPullRequests = async (params: {
  baseRefName: string | null
  fieldFlags: PullRequestFieldFlags
}) => {
  const octokit = getOctokit()

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

  return data.repository?.pullRequests.nodes ?? []
}
