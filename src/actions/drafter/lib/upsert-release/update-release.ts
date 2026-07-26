import type { Endpoints } from '@octokit/types'
import type { GitHubContext } from '#src/common/index.ts'
import type { buildReleasePayload } from '../build-release-payload/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'

export const updateRelease = async (params: {
  draftRelease: Exclude<
    Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease'],
    undefined
  >
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
  github: Pick<GitHubContext, 'octokit' | 'repo'>
}) => {
  const { octokit, repo } = params.github
  const { draftRelease, releasePayload } = params

  type UpdateParams =
    Endpoints['PATCH /repos/{owner}/{repo}/releases/{release_id}']['parameters']

  const updateReleaseParameters: Pick<
    UpdateParams,
    'name' | 'tag_name' | 'target_commitish'
  > = {
    name: releasePayload.name || draftRelease.name || undefined,
    tag_name: releasePayload.tag || draftRelease.tag_name,
    target_commitish: releasePayload.targetCommitish,
  }

  // Let GitHub figure out `name` and `tag_name` if undefined
  if (!updateReleaseParameters.name) {
    delete updateReleaseParameters.name
  }
  if (!updateReleaseParameters.tag_name) {
    delete updateReleaseParameters.tag_name
  }

  // Keep existing `target_commitish` if not overridden
  // (sending `null` resets it to the default branch)
  if (!updateReleaseParameters.target_commitish) {
    delete updateReleaseParameters.target_commitish
  }

  return octokit.rest.repos.updateRelease({
    owner: repo.owner,
    repo: repo.repo,
    release_id: draftRelease.id,
    body: releasePayload.body,
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    make_latest: releasePayload.prerelease
      ? 'false'
      : (releasePayload.make_latest.toString() as 'true' | 'false'),
    ...updateReleaseParameters,
  })
}
