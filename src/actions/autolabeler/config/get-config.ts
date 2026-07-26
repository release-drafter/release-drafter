import { composeConfigGet, type GitHubContext } from '#src/common/index.ts'
import { configSchema } from './config.schema.ts'

export const getConfig = async (
  configName: string,
  github: Pick<GitHubContext, 'logger' | 'octokit' | 'ref' | 'repo'>,
) => {
  const { config, contexts } = await composeConfigGet(
    configName,
    { repo: github.repo, ref: github.ref ?? '' },
    github.octokit,
    github.logger,
  )

  if (contexts.length > 1) {
    github.logger.info(
      `Config was fetched from ${contexts.length} different contexts.`,
    )
  } else if (contexts.length === 1) {
    github.logger.info(
      `Config fetched ${contexts[0].scheme === 'file' ? 'locally' : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ''}"${!contexts[0].ref ? ' on the default branch' : ''}`}.`,
    )
  }

  return configSchema.parse(config)
}
