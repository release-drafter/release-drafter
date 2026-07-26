import { consola } from 'consola'
import { getOctokit } from '#src/common/get-octokit.ts'
import { draftRelease as runReleaseDrafter } from '#src/drafter.ts'
import { resolveToken } from './auth.ts'
import { normalizeConfigTarget, parseRepository } from './options.ts'

export type CliArguments = {
  repository: string
  from?: string
  version?: string
  to?: string
  config: string
  dryRun: boolean
}

export const draftRelease = async (args: CliArguments) => {
  const repo = parseRepository(args.repository)
  const token = await resolveToken()
  const octokit = getOctokit(token)
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
  consola.start(
    args.from
      ? `🔎 Comparing ${args.from} → ${targetCommitish}`
      : `🔎 Finding changes since the last release → ${targetCommitish}`,
  )

  const result = await runReleaseDrafter({
    repo,
    token,
    octokit,
    configName,
    commitish: targetCommitish,
    previousCommitish: args.from,
    version: args.version,
    dryRun: args.dryRun,
  })

  consola.info(
    `📝 Found ${result.pullRequests.length} pull requests across ${result.commits.length} commits`,
  )

  if (args.dryRun) {
    consola.success(`🧪 Dry run complete for ${result.releasePayload.name}`)
  } else {
    consola.success(
      `✨ Draft ready: ${result.upsertedRelease?.data.html_url || result.releasePayload.name}`,
    )
  }

  return result
}
