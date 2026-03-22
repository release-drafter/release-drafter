import * as core from '@actions/core'
import { context } from '@actions/github'
import { executeGraphql, getOctokit } from 'src/common'
import type { ParsedConfig } from '../../config'
import type { findPreviousReleases } from '../find-previous-releases'
import { findCommitsInComparison } from './find-commits-in-comparison'
import { findCommitsWithPathChange } from './find-commits-with-path-change'
import { findMostRecentTag } from './find-most-recent-tag'
import { FindCommitsWithAssociatedPullRequestsDocument } from './graphql/find-commits-with-pr.graphql.generated'

export const findPullRequests = async (params: {
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  config: ParsedConfig
}) => {
  const octokit = getOctokit()

  const shouldFilterByIncludedPaths = params.config['include-paths'].length > 0
  const shouldFilterByExcludedPaths = params.config['exclude-paths'].length > 0

  const sharedComparisonParams = {
    name: context.repo.repo,
    owner: context.repo.owner,
    headRef: params.config.commitish,
    withPullRequestBody: params.config['change-template'].includes('$BODY'),
    withPullRequestURL: params.config['change-template'].includes('$URL'),
    withBaseRefName:
      params.config['change-template'].includes('$BASE_REF_NAME'),
    withHeadRefName:
      params.config['change-template'].includes('$HEAD_REF_NAME'),
    pullRequestLimit: params.config['pull-request-limit'],
    historyLimit: params.config['history-limit'],
  }

  let commits: Awaited<ReturnType<typeof findCommitsInComparison>>

  if (params.lastRelease?.tag_name) {
    // Case 1: previous release with tag → comparison
    core.info(
      `Finding commits between refs/tags/${params.lastRelease.tag_name} and ${params.config.commitish}...`,
    )
    commits = await findCommitsInComparison({
      baseRef: `refs/tags/${params.lastRelease.tag_name}`,
      ...sharedComparisonParams,
    })
  } else {
    // Case 2: no previous release, look for most recent tag
    const mostRecentTag = await findMostRecentTag({
      name: context.repo.repo,
      owner: context.repo.owner,
      tagPrefix: params.config['tag-prefix'] || undefined,
    })

    if (mostRecentTag) {
      core.info(
        `No previous release found. Using most recent tag refs/tags/${mostRecentTag} as base.`,
      )
      core.info(
        `Finding commits between refs/tags/${mostRecentTag} and ${params.config.commitish}...`,
      )
      commits = await findCommitsInComparison({
        baseRef: `refs/tags/${mostRecentTag}`,
        ...sharedComparisonParams,
      })
    } else {
      // Case 3: no tags at all → cap-and-bail
      core.info(
        `No previous release or tag found. Fetching first page of commits (cap-and-bail)...`,
      )
      const capResult = await executeGraphql(
        octokit.graphql,
        FindCommitsWithAssociatedPullRequestsDocument,
        {
          name: context.repo.repo,
          owner: context.repo.owner,
          targetCommitish: params.config.commitish,
          since: params.config['initial-commits-since'],
          after: null,
          withPullRequestBody:
            params.config['change-template'].includes('$BODY'),
          withPullRequestURL: params.config['change-template'].includes('$URL'),
          withBaseRefName:
            params.config['change-template'].includes('$BASE_REF_NAME'),
          withHeadRefName:
            params.config['change-template'].includes('$HEAD_REF_NAME'),
          pullRequestLimit: params.config['pull-request-limit'],
          historyLimit: params.config['history-limit'],
        },
      )
      if (capResult.repository?.object?.__typename !== 'Commit') {
        throw new Error('Query returned an unexpected result')
      }
      if (capResult.repository.object.history.pageInfo.hasNextPage) {
        core.info(
          'Commit history exceeds limit for first release. No changes will be listed.',
        )
        commits = []
      } else {
        commits = (capResult.repository.object.history.nodes ?? []).filter(
          (c): c is NonNullable<typeof c> => c != null,
        )
      }
    }
  }

  core.info(`Found ${commits.length} commits.`)

  const comparisonCommitIds = new Set(commits.map((c) => c.id))

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
        name: context.repo.repo,
        owner: context.repo.owner,
        targetCommitish: params.config.commitish,
        comparisonCommitIds,
      })

    // Short circuit to avoid blowing GraphQL budget
    if (!hasFoundCommits) {
      return { commits: [], pullRequests: [] }
    }

    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      core.info(
        `Found ${ids.size} commits with changes to included path "${path}"`,
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
        name: context.repo.repo,
        owner: context.repo.owner,
        targetCommitish: params.config.commitish,
        comparisonCommitIds,
      },
    )

    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      core.info(
        `Found ${ids.size} commits with changes to excluded path "${path}"`,
      )
      for (const id of ids) {
        excludedCommitIds.add(id)
      }
    })
  }

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
      `After filtering by path changes, ${commits.length} commits remain.`,
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
            [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr] as const,
        ),
    ).values(),
  ]

  const pullRequests = pullRequestsRaw.filter(
    (pr) =>
      // Ensure PR is from the same repository
      pr.baseRepository?.nameWithOwner ===
        `${context.repo.owner}/${context.repo.repo}` &&
      // Ensure PR is merged
      pr.merged,
  )

  core.info(
    `Found ${pullRequestsRaw.length} pull requests associated with those commits. ${pullRequests.length} of those are merged and come from ${context.repo.owner}/${context.repo.repo}${
      pullRequests.length > 0
        ? ` : ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`
        : '.'
    }`,
  )

  return { commits, pullRequests }
}
