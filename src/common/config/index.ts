import { omit } from 'lodash'
import { getConfigFiles } from './get-config-files'
import * as core from '@actions/core'

/**
 * Loads configuration from one or multiple files and resolves with
 * the combined configuration as well as the list of contexts the configuration
 * was loaded from
 */
export async function composeConfigGet(
  configFilename: string,
  currentContext: {
    repo: { owner: string; repo: string }
    ref: string
  }
) {
  core.debug(
    `composeConfigGet: Starting config composition with filename: ${configFilename}`
  )
  core.debug(
    `composeConfigGet: Current context - repo: ${currentContext.repo.owner}/${currentContext.repo.repo}, ref: ${currentContext.ref}`
  )

  const configResults = await getConfigFiles(configFilename, currentContext)
  core.debug(
    `composeConfigGet: Retrieved ${configResults.length} config file(s)`
  )

  const configs = configResults
    .map((res) => omit(res.config, '_extends'))
    .reverse()
    .filter(Boolean)

  const contexts = configResults.map((c) => c.fetchedFrom).filter(Boolean)
  core.debug(`composeConfigGet: Resolved ${contexts.length} context(s)`)
  contexts.forEach((ctx, idx) => {
    core.debug(
      `composeConfigGet: Context[${idx}] - scheme: ${ctx.scheme}, filepath: ${ctx.filepath}${ctx.repo ? `, repo: ${ctx.repo.owner}/${ctx.repo.repo}` : ''}`
    )
  })

  const result = {
    contexts,
    config: Object.assign({}, ...configs)
  }
  core.debug(
    `composeConfigGet: Config composition complete with ${Object.keys(result.config).length} keys`
  )
  return result
}
