import * as core from '@actions/core'
import { getConfigFile } from './get-config-file'
import { normalizeFilepath } from './normalize-filepath'
import { parseConfigTarget } from './parse-config-target'

export const getConfigFiles = async (
  configFilename: string,
  currentContext: {
    repo: { owner: string; repo: string }
    ref: string
  },
) => {
  core.debug(`getConfigFiles: Starting with filename: ${configFilename}`)
  let configTarget = parseConfigTarget(configFilename, currentContext)
  core.debug(
    `getConfigFiles: Parsed config target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`,
  )

  const isCurrentRepoGithubScheme =
    configTarget.scheme === 'github' &&
    configTarget.repo.owner === currentContext.repo.owner &&
    configTarget.repo.repo === currentContext.repo.repo

  let requestedRepoConfig: Awaited<ReturnType<typeof getConfigFile>>
  try {
    requestedRepoConfig = await getConfigFile(configTarget)
  } catch (error) {
    if (
      isCurrentRepoGithubScheme &&
      error instanceof Error &&
      error.message.includes('Config file not found')
    ) {
      core.info(
        `Config not found in ${currentContext.repo.owner}/${currentContext.repo.repo}, falling back to ${currentContext.repo.owner}/.github`,
      )
      const orgFallbackTarget = {
        ...configTarget,
        repo: { owner: currentContext.repo.owner, repo: '.github' },
        ref: undefined,
      }
      requestedRepoConfig = await getConfigFile(orgFallbackTarget)
    } else {
      throw error
    }
  }
  core.debug(
    `getConfigFiles: Fetched initial config from ${requestedRepoConfig.fetchedFrom.scheme}:${requestedRepoConfig.fetchedFrom.filepath}`,
  )

  const files = [requestedRepoConfig]
  let lastFetchedFrom = requestedRepoConfig.fetchedFrom
  let lastExtends = requestedRepoConfig.config._extends

  // if the configuration has no `_extends` key, we are done here.
  if (!lastExtends) {
    core.debug(
      `getConfigFiles: No _extends found in config, returning single file`,
    )
    return files
  }
  core.debug(`getConfigFiles: Found _extends directive: ${lastExtends}`)

  const MAX_EXTENDS_DEPTH = 33
  let extendsDepth = 0

  do {
    extendsDepth++
    core.debug(
      `getConfigFiles: Processing _extends depth ${extendsDepth}: ${lastExtends}`,
    )

    if (extendsDepth > MAX_EXTENDS_DEPTH) {
      const error = `Maximum extends depth (${MAX_EXTENDS_DEPTH}) exceeded. Check for circular dependencies or reduce the chain of extended configurations.`
      core.error(`getConfigFiles: ${error}`)
      throw new Error(error)
    }

    configTarget = parseConfigTarget(lastExtends, lastFetchedFrom)
    core.debug(
      `getConfigFiles: Parsed _extends target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`,
    )

    // Pre-fetch duplicate check: compute what fetchedFrom will be (same logic as
    // getConfigFile) so we can detect loops before making any network request.
    // Rules:
    //   - file: takes priority over github: for the same filepath+repo at any ref
    //     (local checkout is authoritative regardless of what ref the chain targets)
    //   - same-scheme comparisons also require a matching ref
    const normalizedFilepath = normalizeFilepath(configTarget, lastFetchedFrom)
    const preCheckTarget = { ...configTarget, filepath: normalizedFilepath }
    const alreadyLoaded = files.find(({ fetchedFrom: loadedFrom }) => {
      const sameFilepath = loadedFrom.filepath === preCheckTarget.filepath
      const sameRepo =
        loadedFrom.repo.owner === preCheckTarget.repo.owner &&
        loadedFrom.repo.repo === preCheckTarget.repo.repo
      const crossScheme =
        loadedFrom.scheme === 'file' && preCheckTarget.scheme === 'github'
      return (
        sameFilepath &&
        sameRepo &&
        (crossScheme || loadedFrom.ref === preCheckTarget.ref)
      )
    })
    if (alreadyLoaded) {
      core.warning(`Recursion detected. Ignoring "_extends: ${lastExtends}".`)
      core.debug(`getConfigFiles: Recursion detected, stopping extends chain`)
      return files
    }

    const extendRepoConfig = await getConfigFile(configTarget, lastFetchedFrom)
    core.debug(
      `getConfigFiles: Fetched extended config from ${extendRepoConfig.fetchedFrom.scheme}:${extendRepoConfig.fetchedFrom.filepath}`,
    )

    lastFetchedFrom = extendRepoConfig.fetchedFrom
    lastExtends = extendRepoConfig.config._extends
    files.push(extendRepoConfig)
    core.debug(
      `getConfigFiles: Added extended config to chain. Total files: ${files.length}, next _extends: ${lastExtends || 'none'}`,
    )
  } while (lastExtends)
  core.debug(
    `getConfigFiles: Extends chain complete with ${files.length} file(s)`,
  )

  return files
}
