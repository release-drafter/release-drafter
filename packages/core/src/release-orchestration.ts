import { compareVersions } from 'compare-versions'
import { coerce, normalizeRange, satisfies } from 'verkit'
import { needsPullRequestChangedFiles } from './category-matching.ts'
import type { ForgeAdapter, Logger } from './ports.ts'
import { buildReleasePayload } from './release/build-release-payload.ts'
import type {
  DraftReleaseResult,
  ParsedConfig,
  PreviousReleaseConfig,
  PreviousReleases,
  Release,
  ReleaseInput,
  ReleasePayload,
  ReleasePlan,
  Repository,
} from './types.ts'

const stripHeadRef = (commitish: string) =>
  commitish.replace(/^refs\/heads\//, '')

const sortReleases = (params: { releases: Release[]; tagPrefix?: string }) => {
  const stripTagPrefix = (tagName: string) =>
    params.tagPrefix && tagName.startsWith(params.tagPrefix)
      ? tagName.slice(params.tagPrefix.length)
      : tagName

  return [...params.releases].sort((first, second) => {
    try {
      const semverOrder = compareVersions(
        stripTagPrefix(first.tagName),
        stripTagPrefix(second.tagName),
      )
      if (semverOrder !== 0) return semverOrder
    } catch {
      const firstCreatedAt = new Date(first.createdAt ?? '').getTime()
      const secondCreatedAt = new Date(second.createdAt ?? '').getTime()
      if (
        Number.isFinite(firstCreatedAt) &&
        Number.isFinite(secondCreatedAt) &&
        firstCreatedAt !== secondCreatedAt
      ) {
        return firstCreatedAt - secondCreatedAt
      }
    }

    const tagOrder = first.tagName.localeCompare(second.tagName)
    return tagOrder || String(first.id).localeCompare(String(second.id))
  })
}

export const selectPreviousReleases = (params: {
  config: PreviousReleaseConfig
  logger: Logger
  releases: Release[]
}): PreviousReleases => {
  const { config, logger } = params
  const targetCommitish = stripHeadRef(config.commitish ?? '')
  const filterByRange = config['filter-by-range']
  const shouldFilterByRange = Boolean(filterByRange) && filterByRange !== '*'
  const parsedRange =
    shouldFilterByRange && filterByRange ? normalizeRange(filterByRange) : null
  const releases = params.releases.filter((release) => {
    if (
      config['filter-by-commitish'] &&
      targetCommitish !== stripHeadRef(release.targetCommitish ?? '')
    ) {
      return false
    }
    if (
      config['tag-prefix'] &&
      !release.tagName.startsWith(config['tag-prefix'])
    ) {
      return false
    }
    if (shouldFilterByRange) {
      if (!parsedRange) return false
      const coercedVersion = coerce(release.tagName, { loose: true })
      if (!coercedVersion) {
        logger.warning(
          `Failed to coerce semver version for "${release.tagName}" : will be excluded from releases considered for drafting.`,
        )
        return false
      }
      return satisfies(coercedVersion, parsedRange, { loose: true })
    }
    return true
  })
  const draftReleases = releases.filter((release) =>
    config.prerelease ? release.prerelease : !release.prerelease,
  )
  const publishedReleases = releases.filter(
    (release) =>
      !release.draft &&
      (config.prerelease ||
        config['include-pre-releases'] ||
        !release.prerelease),
  )

  return {
    draftRelease: draftReleases.find((release) => release.draft),
    lastRelease: sortReleases({
      releases: publishedReleases,
      tagPrefix: config['tag-prefix'],
    }).at(-1),
  }
}

export const protectReleaseInput = (params: {
  commitish: string
  input: ReleaseInput
  logger: Logger
}) => {
  const { commitish, input, logger } = params
  if (!/^refs\/pull\/\d+\/merge$/.test(commitish)) return input
  if (!input.dryRun) {
    logger.warning(
      `${commitish} points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.`,
    )
  }
  return { ...input, dryRun: true, publish: false }
}

export const executeReleasePlan = async (params: {
  adapter: Pick<ForgeAdapter, 'createRelease' | 'updateRelease'>
  logger: Logger
  plan: ReleasePlan
  repository: Repository
}): Promise<Release | undefined> => {
  const { adapter, logger, plan, repository } = params
  if (plan.action === 'dry-run') {
    logger.info(
      plan.draftRelease
        ? `[dry-run] Would update existing release (id: ${plan.draftRelease.id}) with payload: ${JSON.stringify(plan.releasePayload, null, 2)}`
        : `[dry-run] Would create a new release with payload: ${JSON.stringify(plan.releasePayload, null, 2)}`,
    )
    return undefined
  }
  if (plan.action === 'update') {
    logger.info('Updating existing release...')
    const release = await adapter.updateRelease({
      repository,
      release: plan.draftRelease,
      payload: plan.releasePayload,
    })
    logger.info('Release updated!')
    return release
  }
  logger.info('Creating new release...')
  const release = await adapter.createRelease({
    repository,
    payload: plan.releasePayload,
  })
  logger.info('Release created!')
  return release
}

export const buildReleasePlan = (params: {
  draftRelease?: Release
  input: Pick<ReleaseInput, 'dryRun'>
  releasePayload: ReleasePayload
}) => {
  const { draftRelease, input, releasePayload } = params
  if (input.dryRun) {
    return { action: 'dry-run' as const, draftRelease, releasePayload }
  }
  return draftRelease
    ? { action: 'update' as const, draftRelease, releasePayload }
    : { action: 'create' as const, releasePayload }
}

export const draftRelease = async (params: {
  adapter: ForgeAdapter
  config: ParsedConfig
  input: ReleaseInput
  logger: Logger
  repository: Repository
}): Promise<DraftReleaseResult> => {
  const { adapter, config, logger, repository } = params
  let input = protectReleaseInput({
    commitish: config.commitish,
    input: params.input,
    logger,
  })
  if (!adapter.capabilities.draftReleases && !input.publish) {
    if (!input.dryRun) {
      logger.info(
        'The forge does not support draft releases; calculating the release without writes because publish is false.',
      )
    }
    input = { ...input, dryRun: true }
  }
  const releases = await adapter.listReleases({ repository })
  const { draftRelease, lastRelease } = selectPreviousReleases({
    config,
    logger,
    releases,
  })
  const comparisonBase =
    input.from ?? (lastRelease ? `refs/tags/${lastRelease.tagName}` : undefined)
  const { commits, newContributorLogins, pullRequests } = comparisonBase
    ? await adapter.findChanges({
        repository,
        comparison: {
          baseRef: comparisonBase,
          headRef: config.commitish,
        },
        pullRequestFields: {
          body: config['change-template'].includes('$BODY'),
          url: config['change-template'].includes('$URL'),
          baseRefName: config['change-template'].includes('$BASE_REF_NAME'),
          headRefName: config['change-template'].includes('$HEAD_REF_NAME'),
        },
        pullRequestLimit: config['pull-request-limit'],
        historyLimit: config['history-limit'],
        includeChangedFiles: needsPullRequestChangedFiles(config.categories),
        includeNewContributors: [
          config.header,
          config.template,
          config.footer,
        ].some((template) => template?.includes('$NEW_CONTRIBUTORS')),
      })
    : (() => {
        logger.warning(
          'A previous (published) release is required to find changes',
        )
        return {
          commits: [],
          newContributorLogins: new Set<string>(),
          pullRequests: [],
        }
      })()
  if (pullRequests.length > 0) {
    logger.info(
      `Found ${pullRequests.length} merged pull requests targeting ${repository.owner}/${repository.name}: ${pullRequests.map(({ number }) => `#${number}`).join(', ')}`,
    )
  }
  const releasePayload = await buildReleasePayload({
    adapter,
    commits,
    config,
    input,
    lastRelease,
    logger,
    newContributorLogins,
    pullRequests,
    repository,
  })
  const plan = buildReleasePlan({
    draftRelease: adapter.capabilities.draftReleases
      ? draftRelease
      : releases.find(
          (release) => !release.draft && release.tagName === releasePayload.tag,
        ),
    input,
    releasePayload,
  })
  const release = await executeReleasePlan({
    adapter,
    logger,
    plan,
    repository,
  })
  return { plan, release, releasePayload }
}
