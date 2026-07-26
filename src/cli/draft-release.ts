import { consola, createConsola } from 'consola'
import { getReleaseOutput } from '#src/actions/drafter/config/get-release-output.ts'
import { getOctokit } from '#src/common/get-octokit.ts'
import type { Logger } from '#src/common/logger.ts'
import { draftRelease as runReleaseDrafter } from '#src/drafter.ts'
import { resolveToken } from './auth.ts'
import { normalizeConfigTarget, parseRepository } from './options.ts'

const createLogger = (output: typeof consola): Logger => ({
  debug: (message) => output.debug(message),
  error: (message) => output.error(message),
  info: (message) => output.info(message),
  warning: (message) => output.warn(message),
})

export type CliArguments = {
  repository: string
  from?: string
  name?: string
  tag?: string
  version?: string
  to?: string
  config: string
  dryRun: boolean
  json?: boolean
  publish?: boolean
  prerelease?: boolean
  latest?: boolean
}

export const draftRelease = async (args: CliArguments) => {
  const output = args.json
    ? createConsola({ stdout: process.stderr, stderr: process.stderr })
    : consola
  const logger = createLogger(output)
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

  output.box(`✍️ Release Drafter\n${args.repository}`)

  const result = await runReleaseDrafter({
    repo,
    token,
    octokit,
    configName,
    commitish: targetCommitish,
    previousCommitish: args.from,
    name: args.name,
    tag: args.tag,
    version: args.version,
    dryRun: args.dryRun,
    publish: args.publish,
    prerelease: args.prerelease,
    latest: args.latest,
    logger,
  })

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify(getReleaseOutput(result), null, 2)}\n`,
    )
  }

  return result
}
