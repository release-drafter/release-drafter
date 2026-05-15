import * as core from '@actions/core'
import { context } from '@actions/github'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import { findCommitsInComparison } from './find-commits-in-comparison.ts'
import { findCommitsWithPathChange } from './find-commits-with-path-change.ts'
import { findRecentMergedPullRequests } from './find-recent-merged-pull-requests.ts'

export const findPullRequests = async (params: {
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  config: ParsedConfig
}) => {
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

  if (!params.lastRelease?.tag_name) {
    core.warning('A previous (published) release is required to find changes')
    return { commits: [], pullRequests: [] }
  }

  core.info(
    `Finding commits between refs/tags/${params.lastRelease.tag_name} and ${params.config.commitish}...`,
  )
  commits = await findCommitsInComparison({
    baseRef: `refs/tags/${params.lastRelease.tag_name}`,
    ...sharedComparisonParams,
  })

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
  const pullRequestsByKey = new Map(
    commits
      .flatMap((commit) => commit.associatedPullRequests?.nodes ?? [])
      .filter((pr) => pr != null)
      .map(
        (pr) =>
          [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr] as const,
      ),
  )
  const pullRequestsRaw = [...pullRequestsByKey.values()]

  // GitHub's associatedPullRequests index lags for very recently merged PRs;
  // query the PR table directly to recover any whose merge commit is in range.
  // Build the OID set from path-filtered commits so excluded paths don't recover.
  const comparisonCommitOids = new Set(
    commits.flatMap((c) => (c.oid ? [c.oid] : [])),
  )
  // Filter by branch only when commitish is a confirmed branch ref
  // (refs/heads/...). For bare values (e.g. "main", "v1.2.3") we can't tell
  // branch from tag, so fall back to no filter and rely on OID intersection.
  // Skip the safety net entirely for tag/pull refs since PRs don't merge into
  // those.
  const { commitish } = params.config
  const isBranchRef = commitish.startsWith('refs/heads/')
  const isUnsupportedRef =
    commitish.startsWith('refs/tags/') || commitish.startsWith('refs/pull/')
  const recoveredPRs =
    comparisonCommitOids.size === 0 || isUnsupportedRef
      ? []
      : await findRecentMergedPullRequests({
          baseRefName: isBranchRef
            ? commitish.replace(/^refs\/heads\//, '')
            : null,
          commitOids: comparisonCommitOids,
          foundPrKeys: new Set(pullRequestsByKey.keys()),
          fieldFlags: {
            withPullRequestBody: sharedComparisonParams.withPullRequestBody,
            withPullRequestURL: sharedComparisonParams.withPullRequestURL,
            withBaseRefName: sharedComparisonParams.withBaseRefName,
            withHeadRefName: sharedComparisonParams.withHeadRefName,
          },
        })

  const pullRequests = [...pullRequestsRaw, ...recoveredPRs].filter(
    (pr) =>
      // `baseRepository` is the repository the PR targets, not the head/fork repo.
      // Keep fork PRs that target the current repository, and exclude associated
      // PRs that belong to some other repository but share the same commit.
      pr.baseRepository?.nameWithOwner ===
        `${context.repo.owner}/${context.repo.repo}` &&
      // Ensure PR is merged
      pr.merged,
  )

  core.info(
    `Found ${pullRequests.length} merged pull requests targeting ${context.repo.owner}/${context.repo.repo}${
      pullRequests.length > 0
        ? `: ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`
        : '.'
    }`,
  )

  return { commits, pullRequests }
}
