import type { Octokit } from '../get-octokit.ts'
import type { Logger } from '../logger.ts'
import { getConfigFiles } from './get-config-files.ts'
import { mergeConfigChain } from './merge-config-chain.ts'

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
  },
  octokit: Octokit,
  logger: Logger,
) {
  logger.debug(
    `composeConfigGet: Starting config composition with filename: ${configFilename}`,
  )
  logger.debug(
    `composeConfigGet: Current context - repo: ${currentContext.repo.owner}/${currentContext.repo.repo}, ref: ${currentContext.ref}`,
  )

  const configResults = await getConfigFiles(
    configFilename,
    currentContext,
    octokit,
    logger,
  )
  logger.debug(
    `composeConfigGet: Retrieved ${configResults.length} config file(s)`,
  )

  const contexts = configResults.map((c) => c.fetchedFrom).filter(Boolean)
  logger.debug(`composeConfigGet: Resolved ${contexts.length} context(s)`)
  contexts.forEach((ctx, idx) => {
    logger.debug(
      `composeConfigGet: Context[${idx}] - scheme: ${ctx.scheme}, filepath: ${ctx.filepath}${ctx.repo ? `, repo: ${ctx.repo.owner}/${ctx.repo.repo}` : ''}`,
    )
  })

  const result = {
    contexts,
    config: mergeConfigChain(configResults, logger),
  }
  logger.debug(
    `composeConfigGet: Config composition complete with ${Object.keys(result.config).length} keys`,
  )
  return result
}
