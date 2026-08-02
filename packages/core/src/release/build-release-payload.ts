import type { ForgeAdapter, Logger, Repository } from '../ports.ts'
import type {
  Commit,
  ParsedConfig,
  PullRequest,
  Release,
  ReleaseInput,
  ReleasePayload,
} from '../types.ts'
import { generateChangeLog } from './generate-changelog.ts'
import {
  generateContributorsSentence,
  generateNewContributorsList,
} from './generate-contributors-sentence.ts'
import { getVersionInfo } from './get-version-info.ts'
import { lastReleaseNotFoundTemplate } from './last-release-not-found.ts'
import { renderReleaseName } from './render-release-name.ts'
import { renderTagName } from './render-tag-name.ts'
import { renderTemplate } from './render-template/index.ts'
import { resolveVersionKeyIncrement } from './resolve-version-increment.ts'
import { sortPullRequests } from './sort-pull-requests.ts'

export const buildReleasePayload = async (params: {
  adapter: Pick<ForgeAdapter, 'resolveCommitish'>
  commits: Commit[]
  config: ParsedConfig
  input: ReleaseInput
  lastRelease?: Release
  logger: Logger
  newContributorLogins?: ReadonlySet<string>
  pullRequests: PullRequest[]
  repository: Repository
}): Promise<ReleasePayload> => {
  const {
    adapter,
    commits,
    config,
    input,
    lastRelease,
    logger,
    newContributorLogins = new Set<string>(),
    pullRequests,
    repository,
  } = params
  logger.info('Building release payload and body...')
  const sortedPullRequests = sortPullRequests({ pullRequests, config, logger })
  let body =
    (config.header || '') +
    config.template +
    (!lastRelease
      ? `\n---\n${renderTemplate({ template: lastReleaseNotFoundTemplate, object: { $OWNER: repository.owner, $REPOSITORY: repository.name } })}\n---\n`
      : '') +
    (config.footer || '')

  body = renderTemplate({
    template: body,
    object: {
      $PREVIOUS_TAG: lastRelease?.tagName ?? '',
      $CHANGES: generateChangeLog({
        commits,
        pullRequests: sortedPullRequests,
        serverUrl: repository.serverUrl,
        config,
      }),
      $CONTRIBUTORS: generateContributorsSentence({
        commits,
        pullRequests: sortedPullRequests,
        serverUrl: repository.serverUrl,
        config,
      }),
      $NEW_CONTRIBUTORS: generateNewContributorsList({
        pullRequests: sortedPullRequests,
        newContributorLogins,
        config,
      }),
      $OWNER: repository.owner,
      $REPOSITORY: repository.name,
    },
    replacers: config.replacers,
  })

  const versionKeyIncrement = resolveVersionKeyIncrement({
    pullRequests,
    config,
    logger,
  })
  const versionInfo = getVersionInfo({
    lastRelease,
    config,
    input,
    versionKeyIncrement,
    logger,
  })
  logger.debug(`versionInfo: ${JSON.stringify(versionInfo, null, 2)}`)
  if (versionInfo)
    body = renderTemplate({ template: body, object: versionInfo })

  const releasePayload: ReleasePayload = {
    name: renderReleaseName({
      inputName: input.name,
      config,
      versionInfo,
      logger,
    }),
    tag: renderTagName({
      inputTagName: input.tag,
      config,
      versionInfo,
      logger,
    }),
    body,
    targetCommitish: await adapter.resolveCommitish({
      repository,
      commitish: config.commitish,
    }),
    prerelease: config.prerelease,
    makeLatest: config.latest,
    draft: !input.publish,
    resolvedVersion: versionInfo?.$RESOLVED_VERSION,
    majorVersion: versionInfo?.$RESOLVED_VERSION_MAJOR,
    minorVersion: versionInfo?.$RESOLVED_VERSION_MINOR,
    patchVersion: versionInfo?.$RESOLVED_VERSION_PATCH,
    prereleaseVersion: versionInfo?.$RESOLVED_VERSION_PRERELEASE,
  }

  logger.info('Release payload built successfully')
  logger.info(`  name:                        ${releasePayload.name}`)
  logger.info(`  tag:                         ${releasePayload.tag}`)
  logger.info(
    `  body:                        ${releasePayload.body.length} characters long`,
  )
  logger.info(
    `  targetCommitish:             ${releasePayload.targetCommitish}`,
  )
  logger.info(`  prerelease:                  ${releasePayload.prerelease}`)
  logger.info(`  make_latest:                 ${releasePayload.makeLatest}`)
  logger.info(
    `  draft:                       ${releasePayload.draft}${!releasePayload.draft ? ' (will be published !)' : ''}`,
  )
  logger.info(
    `  RESOLVED_VERSION:            ${releasePayload.resolvedVersion}`,
  )
  logger.info(`  RESOLVED_VERSION_MAJOR:      ${releasePayload.majorVersion}`)
  logger.info(`  RESOLVED_VERSION_MINOR:      ${releasePayload.minorVersion}`)
  logger.info(`  RESOLVED_VERSION_PATCH:      ${releasePayload.patchVersion}`)
  logger.info(
    `  RESOLVED_VERSION_PRERELEASE: ${releasePayload.prereleaseVersion}`,
  )
  return releasePayload
}
