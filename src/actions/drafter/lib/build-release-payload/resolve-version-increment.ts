import * as core from '@actions/core'
import type { ReleaseType } from 'semver'
import {
  filterPullRequestsByPreCategories,
  getChangelogCategories,
  getVersionResolverCategories,
  matchesCategory,
} from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

const priorityMap = {
  patch: 1,
  minor: 2,
  major: 3,
} as const
type Priority = number

type PullRequest = Awaited<
  ReturnType<typeof findPullRequests>
>['pullRequests'][number]
type IncrementCategory = Extract<
  ParsedConfig['categories'][number],
  { 'semver-increment': keyof typeof priorityMap }
>

const getHighestPriority = (params: {
  pullRequests: PullRequest[]
  categories: IncrementCategory[]
  emptyWhenBehavior: 'fallback' | 'uncategorized'
}) => {
  const { pullRequests, categories, emptyWhenBehavior } = params
  const emptyWhenCategory = categories.find(
    (category) => category.when.length === 0,
  )
  const matchedPullRequests = new Set<PullRequest>()
  let highestPriority: Priority | undefined
  let remainingPullRequests = [...pullRequests]

  for (const category of categories) {
    if (category.when.length === 0) {
      continue
    }

    const matchingPullRequests = remainingPullRequests.filter((pullRequest) =>
      matchesCategory(category, pullRequest),
    )
    if (matchingPullRequests.length === 0) {
      continue
    }

    highestPriority = Math.max(
      highestPriority ?? 0,
      priorityMap[category['semver-increment']],
    )

    for (const pullRequest of matchingPullRequests) {
      matchedPullRequests.add(pullRequest)
    }

    if (category.exclusive) {
      const matchedPullRequestsSet = new Set(matchingPullRequests)
      remainingPullRequests = remainingPullRequests.filter(
        (pullRequest) => !matchedPullRequestsSet.has(pullRequest),
      )
    }
  }

  if (!emptyWhenCategory) {
    return highestPriority
  }

  // Version-resolver categories treat an empty `when` as the default fallback.
  if (emptyWhenBehavior === 'fallback') {
    return highestPriority ?? priorityMap[emptyWhenCategory['semver-increment']]
  }

  // Changelog categories only apply their empty `when` bucket to still-unmatched PRs.
  const hasUncategorizedPullRequests = pullRequests.some(
    (pullRequest) => !matchedPullRequests.has(pullRequest),
  )
  if (!hasUncategorizedPullRequests) {
    return highestPriority
  }

  return Math.max(
    highestPriority ?? 0,
    priorityMap[emptyWhenCategory['semver-increment']],
  )
}

export const resolveVersionKeyIncrement = (params: {
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  config: Pick<
    ParsedConfig,
    'categories' | 'prerelease' | 'prerelease-identifier'
  >
}): ReleaseType => {
  const { pullRequests, config } = params

  const filteredPullRequests = filterPullRequestsByPreCategories(
    pullRequests,
    config.categories,
  )
  // Changelog categories contribute only for PRs that end up assigned to them.
  const changelogPriority = getHighestPriority({
    pullRequests: filteredPullRequests,
    categories: getChangelogCategories(config.categories),
    emptyWhenBehavior: 'uncategorized',
  })
  // Version-resolver categories contribute from their own matches plus fallback.
  const versionResolverPriority =
    getHighestPriority({
      pullRequests: filteredPullRequests,
      categories: getVersionResolverCategories(config.categories),
      emptyWhenBehavior: 'fallback',
    }) ?? priorityMap.patch
  // The resolved version follows the most severe increment contributed by either category type.
  const resolvedPriority = Math.max(
    changelogPriority ?? 0,
    versionResolverPriority,
  )
  const versionKey = Object.entries(priorityMap).find(
    ([, priority]) => priority === resolvedPriority,
  )?.[0] as keyof typeof priorityMap

  core.debug(`versionKey: ${versionKey}`)

  let versionKeyIncrement: ReleaseType = versionKey

  const shouldIncrementAsPrerelease =
    config.prerelease && config['prerelease-identifier']

  if (shouldIncrementAsPrerelease) {
    versionKeyIncrement = `pre${versionKeyIncrement}`
  }

  core.info(
    `Version increment: ${versionKeyIncrement}${!versionKey ? ' (default)' : ''}`,
  )

  return versionKeyIncrement
}
