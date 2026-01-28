import { buildReleasePayload } from '../build-release-payload'
import { findPreviousReleases } from '../find-previous-releases'
import { getOctokit } from 'src/common'
import { context } from '@actions/github'
import type { Endpoints } from '@octokit/types'

export const updateRelease = async (params: {
  draftRelease: Exclude<
    Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease'],
    undefined
  >
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const octokit = getOctokit()
  const { draftRelease, releasePayload } = params

  type UpdateParams =
    Endpoints['PATCH /repos/{owner}/{repo}/releases/{release_id}']['parameters']

  const updateReleaseParameters: Pick<
    UpdateParams,
    'name' | 'tag_name' | 'target_commitish'
  > = {
    name: releasePayload.name || draftRelease.name || undefined,
    tag_name: releasePayload.tag || draftRelease.tag_name,
    target_commitish: releasePayload.targetCommitish
  }

  // Let GitHub figure out `name` and `tag_name` if undefined
  if (!updateReleaseParameters.name) {
    delete updateReleaseParameters.name
  }
  if (!updateReleaseParameters.tag_name) {
    delete updateReleaseParameters.tag_name
  }

  // Keep existing `target_commitish` if not overriden
  // (sending `null` resets it to the default branch)
  if (!updateReleaseParameters.target_commitish) {
    delete updateReleaseParameters.target_commitish
  }

  return octokit.rest.repos.updateRelease({
    owner: context.repo.owner,
    repo: context.repo.repo,
    release_id: draftRelease.id,
    body: releasePayload.body,
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    make_latest: releasePayload.make_latest.toString() as 'true' | 'false',
    ...updateReleaseParameters
  })
}
