import * as core from '@actions/core'
import { context } from '@actions/github'
import { composeConfigGet } from '#src/common/index.ts'
import { configSchema } from './schemas/config.schema.ts'

export const getConfig = async (configName: string) => {
  const { config, contexts } = await composeConfigGet(configName, context)

  contexts.forEach(({ filepath, ref, repo, scheme }) => {
    const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ''}`
    const location =
      scheme === 'file'
        ? `locally from "${filepath}"`
        : `from "${remotePath}"${ref ? '' : ' on the default branch'}`

    core.info(`Config fetched ${location}.`)
  })

  return configSchema.parse(config)
}
