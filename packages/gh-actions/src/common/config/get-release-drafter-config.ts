import * as core from '@actions/core'
import { type Config, configSchema } from '@release-drafter/core'
import { prettifyError } from 'zod'
import { ConfigError } from './config-error.ts'
import { composeConfigGet } from './index.ts'
import { describeConfigTarget } from './parse-config-target.ts'

/** Load and validate the standard Release Drafter configuration. */
export const getReleaseDrafterConfig = async (
  configName: string,
  currentContext: {
    repo: { owner: string; repo: string }
    ref: string
  },
  token?: string,
): Promise<Config> => {
  const { config, contexts } = await composeConfigGet(
    configName,
    currentContext,
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
  const result = configSchema.safeParse(config)
  if (!result.success) {
    throw new ConfigError(
      `Invalid Release Drafter config composed from ${contexts.map(describeConfigTarget).join(', ')}:\n${prettifyError(result.error)}`,
      contexts,
      undefined,
      { cause: result.error },
    )
  }
  return result.data
}
