import * as core from '@actions/core'
import { context } from '@actions/github'
import { buildReleasePayload as buildCoreReleasePayload } from '@release-drafter/core'
import { parseCommitishForRelease } from '#src/common/parse-commitish.ts'
import type { ExclusiveInput, ParsedConfig } from '../../config/index.ts'
import {
  toCoreCommit,
  toCorePullRequest,
  toCoreRelease,
  toLegacyReleasePayload,
} from '../core-compat.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

export const buildReleasePayload = async (params: {
  commits: Awaited<ReturnType<typeof findPullRequests>>['commits']
  config: ParsedConfig
  input: ExclusiveInput
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  newContributorLogins?: ReadonlySet<string>
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
}) => {
  const payload = await buildCoreReleasePayload({
    adapter: {
      resolveCommitish: ({ commitish }) => parseCommitishForRelease(commitish),
    },
    commits: params.commits.map(toCoreCommit),
    config: params.config,
    input: {
      name: params.input.name,
      tag: params.input.tag,
      version: params.input.version,
      publish: params.input.publish,
      dryRun: params.input['dry-run'],
    },
    lastRelease: params.lastRelease
      ? toCoreRelease(params.lastRelease)
      : undefined,
    logger: core,
    newContributorLogins: params.newContributorLogins,
    pullRequests: params.pullRequests.map(toCorePullRequest),
    repository: {
      owner: context.repo.owner,
      name: context.repo.repo,
      serverUrl: context.serverUrl,
    },
  })

  return toLegacyReleasePayload(payload)
}
