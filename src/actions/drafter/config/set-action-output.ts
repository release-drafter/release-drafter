import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import { buildReleasePayload } from '../lib'
import * as core from '@actions/core'

export const setActionOutput = (params: {
  upsertedRelease:
    | RestEndpointMethodTypes['repos']['createRelease']['response']
    | RestEndpointMethodTypes['repos']['updateRelease']['response']
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const { releasePayload, upsertedRelease } = params

  const {
    data: {
      id: releaseId,
      html_url: htmlUrl,
      upload_url: uploadUrl,
      tag_name: tagName,
      name: name
    }
  } = upsertedRelease

  const { resolvedVersion, majorVersion, minorVersion, patchVersion, body } =
    releasePayload

  if (releaseId && Number.isInteger(releaseId))
    core.setOutput('id', releaseId.toString())
  if (htmlUrl) core.setOutput('html_url', htmlUrl)
  if (uploadUrl) core.setOutput('upload_url', uploadUrl)
  if (tagName) core.setOutput('tag_name', tagName)
  if (name) core.setOutput('name', name)
  if (resolvedVersion) core.setOutput('resolved_version', resolvedVersion)
  if (majorVersion) core.setOutput('major_version', majorVersion)
  if (minorVersion) core.setOutput('minor_version', minorVersion)
  if (patchVersion) core.setOutput('patch_version', patchVersion)
  core.setOutput('body', body)
}
