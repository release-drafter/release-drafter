import * as core from '@actions/core'
import { context } from '@actions/github'
import { type Config, configSchema } from '@release-drafter/core'
import { composeConfigGet } from '../common/config/index.ts'

export const getConfig = async (
  configName: string,
  token?: string,
): Promise<Config> => {
  const { config, contexts } = await composeConfigGet(
    configName,
    context,
    token,
  )
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
