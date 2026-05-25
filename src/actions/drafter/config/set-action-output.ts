import * as core from '@actions/core'
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import type { buildReleasePayload } from '../lib/index.ts'

export const setActionOutput = (params: {
  upsertedRelease:
    | RestEndpointMethodTypes['repos']['createRelease']['response']
    | RestEndpointMethodTypes['repos']['updateRelease']['response']
    | undefined
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const { releasePayload, upsertedRelease } = params

  core.info('Set action outputs...')

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

  if (upsertedRelease) {
    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl },
    } = upsertedRelease

    if (releaseId && Number.isInteger(releaseId))
      core.setOutput('id', releaseId.toString())
    if (htmlUrl) core.setOutput('html_url', htmlUrl)
    if (uploadUrl) core.setOutput('upload_url', uploadUrl)
  }

  if (outputTagName) core.setOutput('tag_name', outputTagName)
  if (outputName) core.setOutput('name', outputName)
  if (resolvedVersion) core.setOutput('resolved_version', resolvedVersion)
  if (majorVersion) core.setOutput('major_version', majorVersion)
  if (minorVersion) core.setOutput('minor_version', minorVersion)
  if (patchVersion) core.setOutput('patch_version', patchVersion)
  core.setOutput('body', body)

  core.info('Outputs set!')
}
