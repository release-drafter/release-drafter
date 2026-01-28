import { buildReleasePayload } from '../build-release-payload'
import { findPreviousReleases } from '../find-previous-releases'
import * as core from '@actions/core'
import { createRelease } from './create-release'
import { updateRelease } from './update-release'

export const upsertRelease = async (params: {
  draftRelease: Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease']
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const { draftRelease, releasePayload } = params

  if (!draftRelease) {
    core.info('Creating new release')
    return await createRelease({
      releasePayload
    })
  } else {
    core.info('Updating existing release')
    return await updateRelease({
      draftRelease,
      releasePayload
    })
  }
}
