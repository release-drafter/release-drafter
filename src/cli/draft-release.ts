import { consola } from 'consola'
import { getOctokit } from '#src/common/get-octokit.ts'
import type { Logger } from '#src/common/logger.ts'
import { draftRelease as runReleaseDrafter } from '#src/drafter.ts'
import { resolveToken } from './auth.ts'
import { normalizeConfigTarget, parseRepository } from './options.ts'

const logger: Logger = {
  debug: (message) => consola.debug(message),
  error: (message) => consola.error(message),
  info: (message) => consola.info(message),
  warning: (message) => consola.warn(message),
}

export type CliArguments = {
  repository: string
  from?: string
  version?: string
  to?: string
  config: string
  dryRun: boolean
  publish?: boolean
  prerelease?: boolean
  latest?: boolean
}

export const draftRelease = async (args: CliArguments) => {
  const repo = parseRepository(args.repository)
  const token = await resolveToken()
  const octokit = getOctokit(token, { logger })
  const repository = await octokit.rest.repos.get(repo)
  const targetCommitish = args.to || repository.data.default_branch
  const configName = await normalizeConfigTarget(
    args.config,
    async (target) => {
      try {
        const response = await octokit.rest.repos.getContent({
          owner: target.owner,
          repo: target.repo,
          path: target.filepath,
          ref: target.ref,
        })
        return !Array.isArray(response.data) && response.data.type === 'file'
      } catch (error) {
        if ((error as { status?: number }).status === 404) return false
        throw error
      }
    },
  )

  consola.box(`✍️ Release Drafter\n${args.repository}`)

  const result = await runReleaseDrafter({
    repo,
    token,
    octokit,
    configName,
    commitish: targetCommitish,
    previousCommitish: args.from,
    version: args.version,
    dryRun: args.dryRun,
    publish: args.publish,
    prerelease: args.prerelease,
    latest: args.latest,
    logger,
  })

  return result
}
