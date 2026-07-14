import * as core from '@actions/core'
import type { ExclusiveInput, ParsedConfig } from './config/index.ts'
import {
  buildReleasePayload,
  findPreviousReleases,
  findPullRequests,
  upsertRelease,
} from './lib/index.ts'

export const main = async (params: {
  config: ParsedConfig
  input: ExclusiveInput
}) => {
  /**
   * 1. find previous releases - returns latest release
   * 2. find commits since latest release, with their associated pull-requests
   * 3. sort those pull-requests according to the desired config (for release-body)
   * 4. generate release info
   * 5. create a release (may be a draft) or update previous draft
   * 6. set action outputs
   */
  const { config, input } = params
  const isPullRequestMergeRef = /^refs\/pull\/\d+\/merge$/.test(
    config.commitish,
  )
  const effectiveInput = isPullRequestMergeRef
    ? { ...input, 'dry-run': true, publish: false }
    : input

  if (isPullRequestMergeRef && !input['dry-run']) {
    core.warning(
      `${config.commitish} points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.`,
    )
  }

  const { draftRelease, lastRelease } = await findPreviousReleases(config)

  const { commits, newContributorLogins, pullRequests } =
    await findPullRequests({
      lastRelease,
      config,
    })

  const releasePayload = await buildReleasePayload({
    commits,
    config,
    input: effectiveInput,
    lastRelease,
    newContributorLogins,
    pullRequests,
  })

  const upsertedRelease = await upsertRelease({
    draftRelease,
    releasePayload,
    dryRun: effectiveInput['dry-run'],
  })

  return {
    upsertedRelease,
    releasePayload,
  }
}
