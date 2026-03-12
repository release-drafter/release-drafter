import { findPreviousReleases } from '../find-previous-releases'
import { context } from '@actions/github'
import { findCommitsWithPathChange } from './find-commits-with-path-change'
import * as core from '@actions/core'
import { findCommitsWithPr } from './find-commits-with-pr'
import { ParsedConfig } from '../../config'

export const findPullRequests = async (params: {
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  config: ParsedConfig
}) => {
  const since =
    params.lastRelease?.created_at || params.config['initial-commits-since']

  const shouldFilterByIncludedPaths = params.config['include-paths'].length > 0
  const shouldFilterByExcludedPaths = params.config['exclude-paths'].length > 0

  /**
   * If include-paths are specified,
   * find all commits that changed those paths to filter PRs later.
   *
   * If exclude-paths are specified,
   * find all commits that changed those paths and remove them from results.
   *
   * The underlying query does not bother fetching PRs along commits.
   */
  const includedCommitIds = new Set<string>()
  if (shouldFilterByIncludedPaths) {
    core.info('Finding commits with included path changes...')
    const { commitIdsMatchingPaths, hasFoundCommits } =
      await findCommitsWithPathChange(params.config['include-paths'], {
        since,
        name: context.repo.repo,
        owner: context.repo.owner,
        targetCommitish: params.config.commitish
      })

    // Short circuit to avoid blowing GraphQL budget
    if (!hasFoundCommits) {
      return { commits: [], pullRequests: [] }
    }

    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      core.info(
        `Found ${ids.size} commits with changes to included path "${path}"`
      )
      for (const id of ids) {
        includedCommitIds.add(id)
      }
    })
  }

  const excludedCommitIds = new Set<string>()
  if (shouldFilterByExcludedPaths) {
    core.info('Finding commits with excluded path changes...')
    const { commitIdsMatchingPaths } = await findCommitsWithPathChange(
      params.config['exclude-paths'],
      {
        since,
        name: context.repo.repo,
        owner: context.repo.owner,
        targetCommitish: params.config.commitish
      }
    )

    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      core.info(
        `Found ${ids.size} commits with changes to excluded path "${path}"`
      )
      for (const id of ids) {
        excludedCommitIds.add(id)
      }
    })
  }

  core.info(
    `Fetching parent commits of ${params.config['commitish']}${since ? ` since ${since}` : ''}...`
  )

  let commits = await findCommitsWithPr({
    since,
    name: context.repo.repo,
    owner: context.repo.owner,
    targetCommitish: params.config.commitish,
    withPullRequestBody: params.config['change-template'].includes('$BODY'),
    withPullRequestURL: params.config['change-template'].includes('$URL'),
    withBaseRefName:
      params.config['change-template'].includes('$BASE_REF_NAME'),
    withHeadRefName:
      params.config['change-template'].includes('$HEAD_REF_NAME'),
    pullRequestLimit: params.config['pull-request-limit'],
    historyLimit: params.config['history-limit']
  })

  core.info(`Found ${commits.length} commits.`)

  // Filter-out commits that did not change included paths.
  // Excluded paths take precedence over included paths when both are configured.
  commits = commits.filter((commit) => {
    if (excludedCommitIds.has(commit.id)) {
      return false
    }

    if (shouldFilterByIncludedPaths) {
      return includedCommitIds.has(commit.id)
    }

    return true
  })

  if (shouldFilterByIncludedPaths || shouldFilterByExcludedPaths) {
    core.info(
      `After filtering by path changes, ${commits.length} commits remain.`
    )
  }

  // Extract unique PRs from commits, deduplicated by repo + PR number
  const pullRequestsRaw = [
    ...new Map(
      commits
        .flatMap((commit) => commit.associatedPullRequests?.nodes ?? [])
        .filter((pr) => pr != null)
        .map(
          (pr) =>
            [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr] as const
        )
    ).values()
  ]

  const pullRequests = pullRequestsRaw.filter(
    (pr) =>
      // Ensure PR is from the same repository
      pr.baseRepository?.nameWithOwner ===
        `${context.repo.owner}/${context.repo.repo}` &&
      // Ensure PR is merged
      pr.merged
  )

  core.info(
    `Found ${pullRequestsRaw.length} pull requests associated with those commits. ${pullRequests.length} of those are merged and come from ${context.repo.owner}/${context.repo.repo}${
      pullRequests.length > 0
        ? ` : ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`
        : '.'
    }`
  )

  return { commits, pullRequests }
}
