import type { ReleaseType } from 'semver'
import {
  evaluateCategories,
  getVersionResolverCategories,
} from '../category-matching.ts'
import type { Logger } from '../ports.ts'
import type { ParsedConfig, PullRequest } from '../types.ts'

const priority = { patch: 1, minor: 2, major: 3 } as const
const highestIncrement = (
  increments: Array<keyof typeof priority>,
  fallback: keyof typeof priority = 'patch',
) =>
  increments.reduce(
    (current, increment) =>
      priority[increment] > priority[current] ? increment : current,
    fallback,
  )

export const resolveVersionKeyIncrement = (params: {
  pullRequests: PullRequest[]
  config: Pick<
    ParsedConfig,
    'categories' | 'prerelease' | 'prerelease-identifier'
  >
  logger: Logger
}): ReleaseType => {
  const { pullRequests, config, logger } = params
  const changelogIncrements: Array<keyof typeof priority> = []
  const explicitResolverIncrements: Array<keyof typeof priority> = []

  for (const pullRequest of pullRequests) {
    const evaluation = evaluateCategories(pullRequest, config.categories)
    if (!evaluation.included) continue
    for (const category of evaluation.changelogCategories) {
      if (category['semver-increment'] in priority) {
        changelogIncrements.push(category['semver-increment'])
      }
    }
    if (!evaluation.usedVersionFallback) {
      for (const category of evaluation.versionResolverCategories) {
        if (category['semver-increment'] in priority) {
          explicitResolverIncrements.push(category['semver-increment'])
        }
      }
    }
  }

  // A version-resolver fallback is global: it applies only when no change
  // matched any explicit resolver category. This preserves the legacy resolver.
  const resolverFallback = getVersionResolverCategories(config.categories).find(
    (category) => category.when.length === 0,
  )?.['semver-increment']
  const resolverIncrement = highestIncrement(
    explicitResolverIncrements.length > 0
      ? explicitResolverIncrements
      : resolverFallback && resolverFallback in priority
        ? [resolverFallback]
        : ['patch'],
  )
  const resolved = highestIncrement([...changelogIncrements, resolverIncrement])

  logger.debug(`versionKey: ${resolved}`)
  let versionKeyIncrement: ReleaseType = resolved
  if (config.prerelease && config['prerelease-identifier']) {
    versionKeyIncrement = `pre${versionKeyIncrement}` as ReleaseType
  }
  logger.info(`Resolved version increment: ${versionKeyIncrement}`)
  return versionKeyIncrement
}
