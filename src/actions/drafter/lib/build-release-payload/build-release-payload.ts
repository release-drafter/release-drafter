import { findPullRequests } from '../find-pull-requests'
import { findPreviousReleases } from '../find-previous-releases'
import { sortPullRequests } from './sort-pull-requests'
import { renderTemplate } from './render-template'
import { generateChangeLog } from './generate-changelog'
import { generateContributorsSentence } from './generate-contributors-sentence'
import { context } from '@actions/github'
import { resolveVersionKeyIncrement } from './resolve-version-increment'

import * as core from '@actions/core'
import { getVersionInfo } from './get-version-info'
import { Config, ExclusiveInput } from '../../config'

/**
 * Outputs the payload for creating or updating a release.
 *
 * Previously known as `generateReleaseInfo`.
 */
export const buildReleasePayload = (params: {
  commits: Awaited<ReturnType<typeof findPullRequests>>['commits']
  config: Pick<
    Config,
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

  const sortedPullRequests = sortPullRequests({
    pullRequests,
    config
  })

  let body = config['header'] + config.template + config['footer']
  body = renderTemplate({
    template: body,
    object: {
      $PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : '',
      $CHANGES: generateChangeLog({ pullRequests: sortedPullRequests, config }),
      $CONTRIBUTORS: generateContributorsSentence({
        commits,
        pullRequests: sortedPullRequests,
        config
      }),
      $OWNER: context.repo.owner,
      $REPOSITORY: context.repo.repo
    },
    replacers: config.replacers
  })

  const versionKeyIncrement = resolveVersionKeyIncrement({
    pullRequests,
    config
  })

  core.debug('versionKeyIncrement: ' + versionKeyIncrement)

  const versionInfo = getVersionInfo({
    lastRelease,
    config,
    input,
    versionKeyIncrement
  })

  core.debug('versionInfo: ' + JSON.stringify(versionInfo, null, 2))

  if (versionInfo) {
    body = renderTemplate({ template: body, object: versionInfo })
  }

  let mutableInputTag = structuredClone(input['tag'])
  let mutableInputName = structuredClone(input['name'])
  let mutableCommitish = structuredClone(config['commitish'])

  if (mutableInputTag === undefined) {
    mutableInputTag = versionInfo
      ? renderTemplate({
          template: config['tag-template'] || '',
          object: versionInfo
        })
      : ''
  } else if (versionInfo) {
    mutableInputTag = renderTemplate({
      template: mutableInputTag,
      object: versionInfo
    })
  }

  core.debug('tag: ' + mutableInputTag)

  if (mutableInputName === undefined) {
    mutableInputName = versionInfo
      ? renderTemplate({
          template: config['name-template'] || '',
          object: versionInfo
        })
      : ''
  } else if (versionInfo) {
    mutableInputName = renderTemplate({
      template: mutableInputName,
      object: versionInfo
    })
  }

  core.debug('name: ' + mutableInputName)

  /**
   * Tags are not supported as `target_commitish` by Github API.
   * GITHUB_REF or the ref from webhook start with `refs/tags/`, so we handle
   * those here. If it doesn't but is still a tag - it must have been set
   * explicitly by the user, so it's fair to just let the API respond with an error.
   */
  if (mutableCommitish.startsWith('refs/tags/')) {
    core.info(
      `${mutableCommitish} is not supported as release target, falling back to default branch`
    )

    mutableCommitish = ''
  }

  const resolvedVersion = versionInfo.$RESOLVED_VERSION?.version
  const majorVersion = versionInfo.$RESOLVED_VERSION?.$MAJOR
  const minorVersion = versionInfo.$RESOLVED_VERSION?.$MINOR
  const patchVersion = versionInfo.$RESOLVED_VERSION?.$PATCH

  return {
    name: mutableInputName,
    tag: mutableInputTag,
    body,
    targetCommitish: mutableCommitish,
    prerelease: config['prerelease'],
    make_latest: config['latest'],
    draft: !input['publish'],
    resolvedVersion,
    majorVersion,
    minorVersion,
    patchVersion
  }
}
