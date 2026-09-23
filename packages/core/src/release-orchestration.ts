import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
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

type ReleaseAsset = {
  data: Uint8Array
  name: string
  path: string
}

/**
 * Reads configured asset files from disk and verifies unique asset names and
 * forge upload support before any release write, so a missing path or
 * duplicate name fails the run without creating the release.
 */
const prepareReleaseAssets = async (params: {
  adapter: ForgeAdapter
  paths: string[]
}): Promise<ReleaseAsset[]> => {
  const { adapter, paths } = params
  if (paths.length === 0) return []
  // The capability flag and the method are two independent facts, so both are
  // checked: an adapter that declares the capability without implementing the
  // method must fail here rather than silently skipping every upload later.
  if (
    !adapter.capabilities.uploadReleaseAssets ||
    adapter.uploadReleaseAsset === undefined
  ) {
    throw new Error(
      'Release assets are configured, but this forge adapter cannot upload them.',
    )
  }
  const assets: ReleaseAsset[] = []
  const firstPathByName = new Map<string, string>()
  for (const path of paths) {
    const name = basename(path)
    const firstPath = firstPathByName.get(name)
    if (firstPath !== undefined) {
      throw new Error(
        `Duplicate release asset name "${name}" from paths "${firstPath}" and "${path}"; asset names must be unique.`,
      )
    }
    firstPathByName.set(name, path)
    try {
      assets.push({ data: await readFile(path), name, path })
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new Error(`Release asset file not found: "${path}"`)
      }
      throw new Error(
        `Cannot read release asset "${path}": ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  return assets
}

/**
 * Uploads prepared assets after the plan executes. An absent release means the
 * plan was a dry run, so each upload is logged instead. Forge support was
 * already verified by `prepareReleaseAssets`.
 */
const uploadReleaseAssets = async (params: {
  adapter: ForgeAdapter
  assets: ReleaseAsset[]
  logger: Logger
  release?: Release
  repository: Repository
}): Promise<void> => {
  const { adapter, assets, logger, release, repository } = params
  if (assets.length === 0) return
  if (!release) {
    for (const { name, path } of assets) {
      logger.info(
        `[dry-run] Would upload release asset "${name}" from "${path}"`,
      )
    }
    return
  }
  for (const { name, data } of assets) {
    logger.info(`Uploading release asset "${name}"...`)
    // Bound to the adapter: the method may live on the prototype, so calling a
    // detached reference would lose `this`. `prepareReleaseAssets` already
    // rejected an adapter that declares the capability without implementing it.
    await adapter.uploadReleaseAsset?.({ repository, release, name, data })
    logger.info(`Release asset "${name}" uploaded!`)
  }
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
        'This forge does not support draft releases. Because publish is false, Release Drafter will calculate the release but will not write it.',
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
  const releaseAssets = await prepareReleaseAssets({
    adapter,
    paths: input.assets ?? [],
  })
  const release = await executeReleasePlan({
    adapter,
    logger,
    plan,
    repository,
  })
  await uploadReleaseAssets({
    adapter,
    assets: releaseAssets,
    logger,
    release,
    repository,
  })
  return { plan, release, releasePayload }
}
