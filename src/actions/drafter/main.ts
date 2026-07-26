import type { GitHubContext } from '#src/common/index.ts'
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
  previousCommitish?: string
  github: GitHubContext
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
  const { logger } = params.github
  const isPullRequestMergeRef = /^refs\/pull\/\d+\/merge$/.test(
    config.commitish,
  )
  const effectiveInput = isPullRequestMergeRef
    ? { ...input, 'dry-run': true, publish: false }
    : input

  if (isPullRequestMergeRef && !input['dry-run']) {
    logger.warning(
      `${config.commitish} points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.`,
    )
  }

  const { draftRelease, lastRelease } = await findPreviousReleases({
    ...config,
    github: params.github,
  })

  const { commits, newContributorLogins, pullRequests } =
    await findPullRequests({
      lastRelease,
      config,
      previousCommitish: params.previousCommitish,
      github: params.github,
    })

  const releasePayload = await buildReleasePayload({
    commits,
    config,
    input: effectiveInput,
    lastRelease,
    previousCommitish: params.previousCommitish,
    newContributorLogins,
    pullRequests,
    github: params.github,
  })

  const upsertedRelease = await upsertRelease({
    draftRelease,
    releasePayload,
    dryRun: effectiveInput['dry-run'],
    github: params.github,
  })

  return {
    commits,
    pullRequests,
    releasePayload,
    upsertedRelease,
    dryRun: !!effectiveInput['dry-run'],
    previousCommitish: params.previousCommitish ?? lastRelease?.tag_name,
  }
}
