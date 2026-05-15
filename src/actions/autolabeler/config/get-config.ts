import * as core from '@actions/core'
import { context } from '@actions/github'
import { composeConfigGet } from '#src/common/index.ts'
import { configSchema } from './config.schema.ts'

export const getConfig = async (configName: string) => {
  const { config, contexts } = await composeConfigGet(configName, context)

  if (contexts.length > 1) {
    core.info(`Config was fetched from ${contexts.length} different contexts.`)
  } else if (contexts.length === 1) {
    core.info(
      `Config fetched ${contexts[0].scheme === 'file' ? 'locally' : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ''}"${!contexts[0].ref ? ' on the default branch' : ''}`}.`,
    )
  }

  return configSchema.parse(config)
}
