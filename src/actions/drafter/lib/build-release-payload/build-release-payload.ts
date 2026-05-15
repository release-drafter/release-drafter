import * as core from '@actions/core'
import { context } from '@actions/github'
import { parseCommitishForRelease } from '#src/common/parse-commitish.ts'
import type { ExclusiveInput, ParsedConfig } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'
import { generateChangeLog } from './generate-changelog.ts'
import { generateContributorsSentence } from './generate-contributors-sentence.ts'
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
export const buildReleasePayload = (params: {
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
    | 'exclude-labels'
    | 'include-labels'
    | 'categories'
    | 'change-template'
    | 'category-template'
    | 'exclude-contributors'
    | 'no-contributors-template'
    | 'version-resolver'
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
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
}) => {
  const { commits, config, input, lastRelease, pullRequests } = params

  core.info(`Building release payload and body...`)

  const sortedPullRequests = sortPullRequests({
    pullRequests,
    config,
  })

  let body =
    (config.header || '') +
    config.template +
    (!lastRelease
      ? `\n---\n${renderTemplate({ template: lastNotFoundTemplate, object: { $OWNER: context.repo.owner, $REPOSITORY: context.repo.repo } })}\n---\n`
      : '') +
    (config.footer || '')

  body = renderTemplate({
    template: body,
    object: {
      $PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : '',
      $CHANGES: generateChangeLog({ pullRequests: sortedPullRequests, config }),
      $CONTRIBUTORS: generateContributorsSentence({
        commits,
        pullRequests: sortedPullRequests,
        config,
      }),
      $OWNER: context.repo.owner,
      $REPOSITORY: context.repo.repo,
    },
    replacers: config.replacers,
  })

  const versionKeyIncrement = resolveVersionKeyIncrement({
    pullRequests,
    config,
  })

  const versionInfo = getVersionInfo({
    lastRelease,
    config,
    input,
    versionKeyIncrement,
  })

  core.debug(`versionInfo: ${JSON.stringify(versionInfo, null, 2)}`)

  if (versionInfo) {
    body = renderTemplate({ template: body, object: versionInfo })
  }

  const res = {
    name: renderReleaseName({ inputName: input.name, config, versionInfo }),
    tag: renderTagName({ inputTagName: input.tag, config, versionInfo }),
    body,
    targetCommitish: parseCommitishForRelease(config.commitish),
    prerelease: config.prerelease,
    make_latest: config.latest,
    draft: !input.publish,
    resolvedVersion: versionInfo?.$RESOLVED_VERSION,
    majorVersion: versionInfo?.$RESOLVED_VERSION_MAJOR,
    minorVersion: versionInfo?.$RESOLVED_VERSION_MINOR,
    patchVersion: versionInfo?.$RESOLVED_VERSION_PATCH,
    prereleaseVersion: versionInfo?.$RESOLVED_VERSION_PRERELEASE,
  }

  core.info(`Release payload built successfully`)
  core.info(`  name:                        ${res.name}`)
  core.info(`  tag:                         ${res.tag}`)
  core.info(`  body:                        ${res.body.length} characters long`)
  core.info(`  targetCommitish:             ${res.targetCommitish}`)
  core.info(`  prerelease:                  ${res.prerelease}`)
  core.info(`  make_latest:                 ${res.make_latest}`)
  core.info(
    `  draft:                       ${res.draft}${!res.draft ? ' (will be published !)' : ''}`,
  )
  core.info(`  RESOLVED_VERSION:            ${res.resolvedVersion}`)
  core.info(`  RESOLVED_VERSION_MAJOR:      ${res.majorVersion}`)
  core.info(`  RESOLVED_VERSION_MINOR:      ${res.minorVersion}`)
  core.info(`  RESOLVED_VERSION_PATCH:      ${res.patchVersion}`)
  core.info(`  RESOLVED_VERSION_PRERELEASE: ${res.prereleaseVersion}`)

  return res
}
