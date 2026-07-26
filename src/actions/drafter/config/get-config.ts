import { composeConfigGet, type GitHubContext } from '#src/common/index.ts'
import { configSchema } from './schemas/config.schema.ts'

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

  contexts.forEach(({ filepath, ref, repo, scheme }) => {
    const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ''}`
    const location =
      scheme === 'file'
        ? `locally from "${filepath}"`
        : `from "${remotePath}"${ref ? '' : ' on the default branch'}`

    github.logger.info(`Config fetched ${location}.`)
  })

  return configSchema.parse(config)
}
