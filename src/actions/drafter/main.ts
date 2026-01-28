import { Config, ExclusiveInput } from './config'
import {
  findPreviousReleases,
  findPullRequests,
  buildReleasePayload,
  upsertRelease
} from './lib'

export const main = async (params: {
  config: Config
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

  const { draftRelease, lastRelease } = await findPreviousReleases(config)

  const { commits, pullRequests } = await findPullRequests({
    lastRelease,
    config
  })

  const releasePayload = buildReleasePayload({
    commits,
    config,
    input,
    lastRelease,
    pullRequests
  })

  const upsertedRelease = await upsertRelease({ draftRelease, releasePayload })

  return {
    upsertedRelease,
    releasePayload
  }
}
