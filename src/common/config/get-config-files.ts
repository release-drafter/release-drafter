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
  core.debug(`getConfigFiles: Starting with filename: ${configFilename}`)
  let configTarget = parseConfigTarget(configFilename, currentContext)
  core.debug(
    `getConfigFiles: Parsed config target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`
  )

  const requestedRepoConfig = await getConfigFile(configTarget)
  core.debug(
    `getConfigFiles: Fetched initial config from ${requestedRepoConfig.fetchedFrom.scheme}:${requestedRepoConfig.fetchedFrom.filepath}`
  )

  const files = [requestedRepoConfig]
  let lastFetchedFrom = requestedRepoConfig.fetchedFrom
  let lastExtends = requestedRepoConfig.config._extends

  // if the configuration has no `_extends` key, we are done here.
  if (!lastExtends) {
    core.debug(
      `getConfigFiles: No _extends found in config, returning single file`
    )
    return files
  }
  core.debug(`getConfigFiles: Found _extends directive: ${lastExtends}`)

  const MAX_EXTENDS_DEPTH = 33
  let extendsDepth = 0

  do {
    extendsDepth++
    core.debug(
      `getConfigFiles: Processing _extends depth ${extendsDepth}: ${lastExtends}`
    )

    if (extendsDepth > MAX_EXTENDS_DEPTH) {
      const error = `Maximum extends depth (${MAX_EXTENDS_DEPTH}) exceeded. Check for circular dependencies or reduce the chain of extended configurations.`
      core.error(`getConfigFiles: ${error}`)
      throw new Error(error)
    }

    configTarget = parseConfigTarget(lastExtends, lastFetchedFrom)
    core.debug(
      `getConfigFiles: Parsed _extends target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`
    )

    const extendRepoConfig = await getConfigFile(configTarget, lastFetchedFrom)
    core.debug(
      `getConfigFiles: Fetched extended config from ${extendRepoConfig.fetchedFrom.scheme}:${extendRepoConfig.fetchedFrom.filepath}`
    )

    // Avoid loops
    const { fetchedFrom: extendedFrom } = extendRepoConfig
    const alreadyLoaded = files.find(
      ({ fetchedFrom: loadedFrom }) =>
        loadedFrom.scheme === extendedFrom.scheme &&
        loadedFrom.filepath === extendedFrom.filepath &&
        loadedFrom.ref === extendedFrom.ref &&
        loadedFrom.repo.owner === extendedFrom.repo.owner &&
        loadedFrom.repo.repo === extendedFrom.repo.repo
    )
    if (alreadyLoaded) {
      core.warning(
        `Recursion detected. Configuration with identical content was already loaded. Ignoring "_extends: ${extendRepoConfig.config._extends}".`
      )
      core.debug(`getConfigFiles: Recursion detected, stopping extends chain`)
      return files
    } else {
      lastFetchedFrom = extendRepoConfig.fetchedFrom
      lastExtends = extendRepoConfig.config._extends
      files.push(extendRepoConfig)
      core.debug(
        `getConfigFiles: Added extended config to chain. Total files: ${files.length}, next _extends: ${lastExtends || 'none'}`
      )
    }
  } while (lastExtends)
  core.debug(
    `getConfigFiles: Extends chain complete with ${files.length} file(s)`
  )

  return files
}
