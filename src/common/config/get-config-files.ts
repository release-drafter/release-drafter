import { isEqual, omit } from 'lodash'
import { getConfigFile } from './get-config-file'
import { parseConfigTarget } from './parse-config-target'
import * as core from '@actions/core'

export const getConfigFiles = async (
  configFilename: string,
  currentContext: {
    repo: { owner: string; repo: string }
    ref: string
  }
) => {
  let configTarget = parseConfigTarget(configFilename, currentContext)

  const requestedRepoConfig = await getConfigFile(configTarget)

  const files = [requestedRepoConfig]
  let lastFetchedFrom = requestedRepoConfig.fetchedFrom
  let lastExtends = requestedRepoConfig.config._extends

  // if the configuration has no `_extends` key, we are done here.
  if (!lastExtends) {
    return files
  }

  const MAX_EXTENDS_DEPTH = 33
  let extendsDepth = 0

  do {
    extendsDepth++
    if (extendsDepth > MAX_EXTENDS_DEPTH) {
      throw new Error(
        `Maximum extends depth (${MAX_EXTENDS_DEPTH}) exceeded. Check for circular dependencies or reduce the chain of extended configurations.`
      )
    }

    configTarget = parseConfigTarget(lastExtends, lastFetchedFrom)

    const extendRepoConfig = await getConfigFile(configTarget, lastFetchedFrom)

    // Avoid loops
    const alreadyLoaded = files.find((file) =>
      isEqual(
        omit(file.config, '_extends'),
        omit(extendRepoConfig.config, '_extends')
      )
    )
    if (alreadyLoaded) {
      core.warning(
        `Recursion detected. Configuration with identical content was already loaded. Ignoring "_extends: ${extendRepoConfig.config._extends}".`
      )
      return files
    } else {
      lastFetchedFrom = extendRepoConfig.fetchedFrom
      lastExtends = extendRepoConfig.config._extends
      files.push(extendRepoConfig)
    }
  } while (lastExtends)

  return files
}
