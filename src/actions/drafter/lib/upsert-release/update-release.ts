import {
  getGitHubAdapter,
  getOctokit,
  getRepository,
} from '#src/common/index.ts'
import type { buildReleasePayload } from '../build-release-payload/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'

export const updateRelease = async (params: {
  draftRelease: Exclude<
    Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease'],
    undefined
  >
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const { draftRelease, releasePayload } = params
  const release = await getGitHubAdapter(getOctokit()).updateRelease({
    repository: getRepository(),
    release: {
      id: draftRelease.id ?? '',
      tagName: draftRelease.tag_name,
      name: draftRelease.name,
      targetCommitish: draftRelease.target_commitish,
      createdAt: draftRelease.created_at,
      draft: draftRelease.draft,
      prerelease: draftRelease.prerelease,
      url: draftRelease.html_url,
      uploadUrl: draftRelease.upload_url,
    },
    payload: {
      ...releasePayload,
      makeLatest: releasePayload.make_latest,
    },
  })
  return {
    data: {
      id: release.id,
      tag_name: release.tagName,
      name: release.name ?? null,
      target_commitish: release.targetCommitish ?? '',
      created_at: release.createdAt ?? '',
      draft: release.draft ?? false,
      prerelease: release.prerelease ?? false,
      html_url: release.url ?? '',
      upload_url: release.uploadUrl ?? '',
    },
  }
}
