import { findPullRequests } from '../find-pull-requests'
import * as core from '@actions/core'
import {
  getFilterExcludedPullRequests,
  getFilterIncludedPullRequests
} from './categorize-pull-requests'
import * as semver from 'semver'
import { Config } from '../../config'

export const resolveVersionKeyIncrement = (params: {
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  config: Pick<
    Config,
    | 'version-resolver'
    | 'prerelease'
    | 'prerelease-identifier'
    | 'exclude-labels'
    | 'include-labels'
  >
}): semver.ReleaseType => {
  const { pullRequests, config } = params

  const priorityMap = {
    patch: 1,
    minor: 2,
    major: 3
  }

  const labelToKeyMap: Record<string, keyof typeof priorityMap> =
    Object.fromEntries(
      Object.keys(priorityMap)
        .flatMap((key) => [
          config['version-resolver'][
            key as keyof typeof priorityMap
          ].labels.map((label) => [label, key])
        ])
        .flat()
    )

  core.debug('labelToKeyMap: ' + JSON.stringify(labelToKeyMap))

  const keys = pullRequests
    .filter(getFilterExcludedPullRequests(config['exclude-labels']))
    .filter(getFilterIncludedPullRequests(config['include-labels']))
    .flatMap((pr) =>
      pr.labels?.nodes
        ?.filter((n) => !!n?.name)
        .map((node) => labelToKeyMap[node!.name])
    )
    .filter(Boolean) as (keyof typeof priorityMap)[]

  core.debug('keys: ' + JSON.stringify(keys))

  const keyPriorities = keys.map((key) => priorityMap[key])
  const priority = Math.max(...keyPriorities)
  const versionKey = Object.keys(priorityMap).find(
    (key) => priorityMap[key as keyof typeof priorityMap] === priority
  ) as keyof typeof priorityMap | undefined

  core.debug('versionKey: ' + versionKey)

  const versionKeyIncrement = versionKey || config['version-resolver'].default

  const shouldIncrementAsPrerelease =
    config['prerelease'] && config['prerelease-identifier']

  if (!shouldIncrementAsPrerelease) {
    return versionKeyIncrement
  }

  return `pre${versionKeyIncrement}`
}
