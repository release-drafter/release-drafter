import { Config } from 'src/types'
import { findPreviousReleases } from '../find-previous-releases'
import { context } from '@actions/github'
import { findCommitsWithPathChange } from './find-commits-with-path-change'
import core from '@actions/core'
import { findCommitsWithPr } from './find-commits-with-pr'
import _ from 'lodash'

export const findPullRequests = async (params: {
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  config: Config
}) => {
  const since =
    params.lastRelease?.created_at || params.config['initial-commits-since']

  const shouldfilterByChangedPaths = params.config['include-paths'].length > 0

  /**
   * If include-paths are specified,
   * find all commits that changed those paths to filter PRs later
   *
   * The underlying query does not bother fetching PRs along commits.
   */
  let commitIdsMatchingPaths: Record<string, Set<string>> = {}
  if (shouldfilterByChangedPaths) {
    core.info('Finding commits with path changes...')
    const {
      commitIdsMatchingPaths: commitIdsMatchingPathsRes,
      hasFoundCommits
    } = await findCommitsWithPathChange(params.config['include-paths'], {
      since,
      name: context.repo.repo,
      owner: context.repo.owner,
      targetCommitish: params.config.commitish
    })

    // Short circuit to avoid blowing GraphQL budget
    if (!hasFoundCommits) {
      return { commits: [], pullRequests: [] }
    }

    commitIdsMatchingPaths = commitIdsMatchingPathsRes
    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      core.info(`Found ${ids.size} commits with changes to path "${path}"`)
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

  // Filter-out commits that did not change specified paths
  commits = shouldfilterByChangedPaths
    ? commits.filter((commit) =>
        params.config['include-paths'].some((path) =>
          commitIdsMatchingPaths[path].has(commit.id)
        )
      )
    : commits

  if (shouldfilterByChangedPaths) {
    core.info(
      `After filtering by path changes, ${commits.length} commits remain.`
    )
  }

  // Extract PRs from commits
  let pullRequests = _.uniqBy(
    commits.flatMap((commit) => commit.associatedPullRequests?.nodes),
    'number'
  ).filter((pr) => !!pr)

  core.info(
    `Found ${pullRequests.length} pull requests associated with those commits.`
  )

  pullRequests = pullRequests.filter(
    (pr) =>
      // Ensure PR is from the same repository
      pr.baseRepository?.nameWithOwner ===
        `${context.repo.owner}/${context.repo.repo}` &&
      // Ensure PR is merged
      pr.merged
  )

  core.info(
    `After filtering, ${pullRequests.length} pull requests remain : ${pullRequests
      .map((pr) => `#${pr.number}`)
      .join(', ')}`
  )

  return { commits, pullRequests }
}
