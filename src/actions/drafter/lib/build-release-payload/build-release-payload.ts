import {
  type GitHubContext,
  parseCommitishForRelease,
} from '#src/common/index.ts'
import type { ExclusiveInput, ParsedConfig } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'
import { generateChangeLog } from './generate-changelog.ts'
import {
  generateContributorsSentence,
  generateNewContributorsList,
} from './generate-contributors-sentence.ts'
import { getVersionInfo } from './get-version-info.ts'
import { renderReleaseName } from './render-release-name.ts'
import { renderTagName } from './render-tag-name.ts'
import { renderTemplate } from './render-template/index.ts'
import { resolveVersionKeyIncrement } from './resolve-version-increment.ts'
import { sortPullRequests } from './sort-pull-requests.ts'
import lastNotFoundTemplate from './static/last-not-found.md?raw'

/**
 * Outputs the payload for creating or updating a release.
 *
 * Previously known as `generateReleaseInfo`.
 */
export const buildReleasePayload = async (params: {
  commits: Awaited<ReturnType<typeof findPullRequests>>['commits']
  config: Pick<
    ParsedConfig,
    | 'sort-by'
    | 'sort-direction'
    | 'header'
    | 'footer'
    | 'template'
    | 'replacers'
    | 'change-title-escapes'
    | 'no-changes-template'
    | 'categories'
    | 'change-template'
    | 'change-author-template'
    | 'change-authors-separator'
    | 'change-authors-final-separator'
    | 'category-template'
    | 'exclude-contributors'
    | 'new-contributor-template'
    | 'no-contributors-template'
    | 'prerelease'
    | 'version-template'
    | 'tag-prefix'
    | 'prerelease-identifier'
    | 'tag-template'
    | 'name-template'
    | 'commitish'
    | 'latest'
  >
  input: ExclusiveInput
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  previousCommitish?: string
  newContributorLogins?: ReadonlySet<string>
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  github: GitHubContext
}) => {
  const {
    commits,
    config,
    input,
    lastRelease,
    previousCommitish,
    newContributorLogins = new Set<string>(),
    pullRequests,
  } = params
  const { logger, octokit, repo, serverUrl } = params.github

  logger.info(`📝 Generating release payload and body...`)

  const sortedPullRequests = sortPullRequests({
    pullRequests,
    config,
    logger,
  })

  let body =
    (config.header || '') +
    config.template +
    (!lastRelease && !previousCommitish
      ? `\n---\n${renderTemplate({ template: lastNotFoundTemplate, object: { $OWNER: repo.owner, $REPOSITORY: repo.repo } })}\n---\n`
      : '') +
    (config.footer || '')

  body = renderTemplate({
    template: body,
    object: {
      $PREVIOUS_TAG: previousCommitish ?? lastRelease?.tag_name ?? '',
      $CHANGES: generateChangeLog({
        commits,
        pullRequests: sortedPullRequests,
        config,
        serverUrl,
      }),
      $CONTRIBUTORS: generateContributorsSentence({
        commits,
        pullRequests: sortedPullRequests,
        config,
        serverUrl,
      }),
      $NEW_CONTRIBUTORS: generateNewContributorsList({
        pullRequests: sortedPullRequests,
        newContributorLogins,
        config,
      }),
      $OWNER: repo.owner,
      $REPOSITORY: repo.repo,
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

  logger.debug(`🤖 versionInfo: ${JSON.stringify(versionInfo, null, 2)}`)

  if (versionInfo) {
    body = renderTemplate({ template: body, object: versionInfo })
  }

  const res = {
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
    targetCommitish: await parseCommitishForRelease(config.commitish, {
      octokit,
      repo,
      logger,
    }),
    prerelease: config.prerelease,
    make_latest: config.prerelease ? false : config.latest,
    draft: !input.publish,
    resolvedVersion: versionInfo?.$RESOLVED_VERSION,
    majorVersion: versionInfo?.$RESOLVED_VERSION_MAJOR,
    minorVersion: versionInfo?.$RESOLVED_VERSION_MINOR,
    patchVersion: versionInfo?.$RESOLVED_VERSION_PATCH,
    prereleaseVersion: versionInfo?.$RESOLVED_VERSION_PRERELEASE,
  }

  logger.info(`  Release payload built successfully`)
  logger.info(`  name:                        ${res.name}`)
  logger.info(`  tag:                         ${res.tag}`)
  logger.info(
    `  body:                        ${res.body.length} characters long`,
  )
  logger.info(`  targetCommitish:             ${res.targetCommitish}`)
  logger.info(`  prerelease:                  ${res.prerelease}`)
  logger.info(`  make_latest:                 ${res.make_latest}`)
  logger.info(
    `  draft:                       ${res.draft}${!res.draft ? ' (will be published !)' : ''}`,
  )
  logger.info(`  RESOLVED_VERSION:            ${res.resolvedVersion}`)
  logger.info(`  RESOLVED_VERSION_MAJOR:      ${res.majorVersion}`)
  logger.info(`  RESOLVED_VERSION_MINOR:      ${res.minorVersion}`)
  logger.info(`  RESOLVED_VERSION_PATCH:      ${res.patchVersion}`)
  logger.info(`  RESOLVED_VERSION_PRERELEASE: ${res.prereleaseVersion}`)

  return res
}
