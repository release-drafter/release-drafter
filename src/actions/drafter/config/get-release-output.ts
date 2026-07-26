import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import type { buildReleasePayload } from '../lib/index.ts'

export const getReleaseOutput = (params: {
  upsertedRelease:
    | RestEndpointMethodTypes['repos']['createRelease']['response']
    | RestEndpointMethodTypes['repos']['updateRelease']['response']
    | undefined
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
  previousCommitish?: string
  dryRun: boolean
}) => {
  const { releasePayload, upsertedRelease } = params
  const {
    resolvedVersion,
    majorVersion,
    minorVersion,
    patchVersion,
    body,
    name: releaseName,
    tag: releaseTagName,
  } = releasePayload
  const outputName = upsertedRelease?.data.name ?? releaseName
  const outputTagName = upsertedRelease?.data.tag_name ?? releaseTagName
  const releaseId = upsertedRelease?.data.id
  const htmlUrl = upsertedRelease?.data.html_url
  const uploadUrl = upsertedRelease?.data.upload_url

  return {
    ...(releaseId && Number.isInteger(releaseId)
      ? { id: releaseId.toString() }
      : {}),
    ...(htmlUrl ? { html_url: htmlUrl } : {}),
    ...(uploadUrl ? { upload_url: uploadUrl } : {}),
    ...(outputTagName ? { tag_name: outputTagName } : {}),
    target_commitish: releasePayload.targetCommitish,
    ...(params.previousCommitish
      ? { previous_commitish: params.previousCommitish }
      : {}),
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    latest: releasePayload.make_latest,
    dry_run: params.dryRun,
    ...(outputName ? { name: outputName } : {}),
    ...(resolvedVersion ? { resolved_version: resolvedVersion } : {}),
    ...(majorVersion ? { major_version: majorVersion } : {}),
    ...(minorVersion ? { minor_version: minorVersion } : {}),
    ...(patchVersion ? { patch_version: patchVersion } : {}),
    body,
  }
}
