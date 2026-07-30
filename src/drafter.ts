import process from 'node:process'
import { getConfig } from '#src/actions/drafter/config/get-config.ts'
import { mergeInputAndConfig } from '#src/actions/drafter/config/merge-input-and-config.ts'
import { actionInputSchema } from '#src/actions/drafter/config/schemas/action-input.schema.ts'
import { main } from '#src/actions/drafter/main.ts'
import { getOctokit, type Octokit } from '#src/common/get-octokit.ts'
import { type Logger, noopLogger } from '#src/common/logger.ts'
import { resolveRestOnly } from '#src/common/resolve-api-mode.ts'

export type DraftReleaseOptions = {
  repo: { owner: string; repo: string }
  /** Required unless a preconfigured {@link octokit} is supplied. */
  token?: string
  octokit?: Octokit
  configName?: string
  commitish?: string
  previousCommitish?: string
  name?: string
  tag?: string
  version?: string
  dryRun?: boolean
  publish?: boolean
  prerelease?: boolean
  latest?: boolean
  apiUrl?: string
  serverUrl?: string
  /**
   * Forces the REST-only code paths, for forges with no GraphQL API. Left unset,
   * it is inferred from {@link apiUrl} and the environment; see
   * {@link resolveRestOnly}.
   */
  restOnly?: boolean
  logger?: Logger
}

export const draftRelease = async (options: DraftReleaseOptions) => {
  const logger = options.logger ?? noopLogger
  const octokit =
    options.octokit ??
    getOctokit(options.token, { baseUrl: options.apiUrl, logger })
  const repository = options.commitish
    ? undefined
    : await octokit.rest.repos.get(options.repo)
  const commitish = options.commitish || repository?.data.default_branch
  if (!commitish) throw new Error('Unable to resolve the target commitish')

  const restOnly = resolveRestOnly({
    explicit: options.restOnly,
    apiUrl: options.apiUrl ?? process.env.GITHUB_API_URL,
  })
  const github = {
    repo: options.repo,
    ref: commitish,
    serverUrl:
      options.serverUrl ??
      process.env.GITHUB_SERVER_URL ??
      'https://github.com',
    octokit,
    logger,
    restOnly,
  }

  if (restOnly) {
    logger.debug(
      'No GraphQL API detected; using the REST-only comparison and commitish resolvers.',
    )
  }

  logger.info(
    `⚙️ Loading configuration from ${options.configName ?? 'release-drafter.yml'}...`,
  )

  const input = actionInputSchema.parse({
    'config-name': options.configName,
    name: options.name,
    tag: options.tag,
    version: options.version,
    publish: options.publish?.toString(),
    prerelease: options.prerelease?.toString(),
    latest: options.latest?.toString(),
    token: options.token,
    'dry-run': options.dryRun,
    commitish,
  })
  const config = mergeInputAndConfig({
    config: await getConfig(input['config-name'], github),
    input,
    logger,
    ref: github.ref,
  })

  return main({
    config,
    input,
    previousCommitish: options.previousCommitish,
    github,
  })
}
