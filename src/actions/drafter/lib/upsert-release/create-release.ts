import {
  getGitHubAdapter,
  getOctokit,
  getRepository,
} from '#src/common/index.ts'
import type { buildReleasePayload } from '../build-release-payload/index.ts'

export const createRelease = async (params: {
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const { releasePayload } = params
  const release = await getGitHubAdapter(getOctokit()).createRelease({
    repository: getRepository(),
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
