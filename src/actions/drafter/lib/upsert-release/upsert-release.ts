import * as core from '@actions/core'
import type { buildReleasePayload } from '../build-release-payload/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import { createRelease } from './create-release.ts'
import { updateRelease } from './update-release.ts'

export const upsertRelease = async (params: {
  draftRelease: Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease']
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
  dryRun?: boolean
}) => {
  const { draftRelease, releasePayload, dryRun } = params

  if (dryRun) {
    if (!draftRelease) {
      core.info(
        `[dry-run] Would create a new release with payload: ${JSON.stringify(releasePayload, null, 2)}`,
      )
    } else {
      core.info(
        `[dry-run] Would update existing release (id: ${draftRelease.id}) with payload: ${JSON.stringify(releasePayload, null, 2)}`,
      )
    }
    return undefined
  }

  if (!draftRelease) {
    core.info('Creating new release...')
    const res = await createRelease({
      releasePayload,
    })
    core.info('Release created!')
    return res
  } else {
    core.info('Updating existing release...')
    const res = await updateRelease({
      draftRelease,
      releasePayload,
    })
    core.info('Release updated!')
    return res
  }
}
