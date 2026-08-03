import * as core from '@actions/core'
import type { DraftReleaseResult } from '@release-drafter/core'

/** Preserve the complete historical Drafter Action output contract. */
export const setActionOutput = ({
  release,
  releasePayload,
}: DraftReleaseResult): void => {
  core.info('Set action outputs...')
  const outputName = release?.name ?? releasePayload.name
  const outputTagName = release?.tagName ?? releasePayload.tag

  if (release) {
    if (release.id && Number.isInteger(release.id))
      core.setOutput('id', release.id.toString())
    if (release.url) core.setOutput('html_url', release.url)
    if (release.uploadUrl) core.setOutput('upload_url', release.uploadUrl)
  }
  if (outputTagName) core.setOutput('tag_name', outputTagName)
  if (outputName) core.setOutput('name', outputName)
  if (releasePayload.resolvedVersion)
    core.setOutput('resolved_version', releasePayload.resolvedVersion)
  if (releasePayload.majorVersion)
    core.setOutput('major_version', releasePayload.majorVersion)
  if (releasePayload.minorVersion)
    core.setOutput('minor_version', releasePayload.minorVersion)
  if (releasePayload.patchVersion)
    core.setOutput('patch_version', releasePayload.patchVersion)
  core.setOutput('body', releasePayload.body)
  core.info('Outputs set!')
}
