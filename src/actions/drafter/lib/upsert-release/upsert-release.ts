import type { GitHubContext } from '#src/common/index.ts'
import type { buildReleasePayload } from '../build-release-payload/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import { createRelease } from './create-release.ts'
import { updateRelease } from './update-release.ts'

export const upsertRelease = async (params: {
  draftRelease: Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease']
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
  dryRun?: boolean
  github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo'>
}) => {
  const { draftRelease, releasePayload, dryRun } = params
  const { logger } = params.github

  if (dryRun) {
    if (!draftRelease) {
      logger.info(
        `🤖 [dry-run] Would create a new release with payload: ${JSON.stringify(releasePayload, null, 2)}`,
      )
    } else {
      logger.info(
        `🤖 [dry-run] Would update existing release (id: ${draftRelease.id}) with payload: ${JSON.stringify(releasePayload, null, 2)}`,
      )
    }
    return undefined
  }

  if (!draftRelease) {
    logger.info('🚀 Creating new release...')
    const res = await createRelease({
      releasePayload,
      github: params.github,
    })
    logger.info(
      `🎉 Release created: ${res.data.html_url || releasePayload.name}`,
    )
    return res
  } else {
    logger.info('🚀 Updating existing release...')
    const res = await updateRelease({
      draftRelease,
      releasePayload,
      github: params.github,
    })
    logger.info(
      `🎉 Release updated: ${res.data.html_url || releasePayload.name}`,
    )
    return res
  }
}
