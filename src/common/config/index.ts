import { omit } from 'lodash'
import { getConfigFiles } from './get-config-files'

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
  const configResults = await getConfigFiles(configFilename, currentContext)

  const configs = configResults
    .map((res) => omit(res.config, '_extends'))
    .reverse()
    .filter(Boolean)

  const contexts = configResults.map((c) => c.fetchedFrom).filter(Boolean)

  return {
    contexts,
    config: Object.assign({}, ...configs)
  }
}
