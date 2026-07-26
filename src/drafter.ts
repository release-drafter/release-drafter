import {
  getConfig,
  mergeInputAndConfig,
} from '#src/actions/drafter/config/index.ts'
import { actionInputSchema } from '#src/actions/drafter/config/schemas/action-input.schema.ts'
import {
  buildReleasePayload,
  findPreviousReleases,
  findPullRequests,
  upsertRelease,
} from '#src/actions/drafter/lib/index.ts'
import { getOctokit, type Octokit } from '#src/common/get-octokit.ts'

export type DraftReleaseOptions = {
  repo: { owner: string; repo: string }
  token: string
  octokit?: Octokit
  configName?: string
  commitish?: string
  previousCommitish?: string
  version?: string
  dryRun?: boolean
  serverUrl?: string
}

export const draftRelease = async (options: DraftReleaseOptions) => {
  const octokit = options.octokit ?? getOctokit(options.token)
  const repository = options.commitish
    ? undefined
    : await octokit.rest.repos.get(options.repo)
  const commitish = options.commitish || repository?.data.default_branch
  if (!commitish) throw new Error('Unable to resolve the target commitish')

  const github = {
    repo: options.repo,
    ref: commitish,
    serverUrl: options.serverUrl ?? 'https://github.com',
    octokit,
  }

  const input = actionInputSchema.parse({
    'config-name': options.configName,
    version: options.version,
    publish: 'false',
    token: options.token,
    'dry-run': options.dryRun,
    commitish,
  })
  const config = mergeInputAndConfig({
    config: await getConfig(input['config-name'], github),
    input,
    ref: github.ref,
  })
  const { draftRelease: existingDraft, lastRelease } =
    await findPreviousReleases({ ...config, github })
  const { commits, newContributorLogins, pullRequests } =
    await findPullRequests({
      lastRelease,
      config,
      previousCommitish: options.previousCommitish,
      github,
    })
  const releasePayload = await buildReleasePayload({
    commits,
    config,
    input,
    lastRelease,
    previousCommitish: options.previousCommitish,
    newContributorLogins,
    pullRequests,
    github,
  })
  const upsertedRelease = await upsertRelease({
    draftRelease: existingDraft,
    releasePayload,
    dryRun: options.dryRun,
    github,
  })

  return {
    commits,
    pullRequests,
    releasePayload,
    upsertedRelease,
  }
}
