import * as core from '@actions/core'
import type { DraftReleaseResult } from '@release-drafter/core'
import { writeActionOutputs } from '../common/action-contract.ts'
import { actionOutputNames } from './action-metadata.ts'

/** Set every declared Drafter action output from the release result. */
export const setActionOutput = ({
  release,
  releasePayload,
}: DraftReleaseResult): void => {
  core.info('Set action outputs...')
  const outputName = release?.name ?? releasePayload.name
  const outputTagName = release?.tagName ?? releasePayload.tag

  writeActionOutputs(actionOutputNames, {
    id:
      release?.id && Number.isInteger(release.id)
        ? release.id.toString()
        : undefined,
    html_url: release?.url || undefined,
    upload_url: release?.uploadUrl || undefined,
    tag_name: outputTagName || undefined,
    name: outputName || undefined,
    resolved_version: releasePayload.resolvedVersion || undefined,
    major_version: releasePayload.majorVersion || undefined,
    minor_version: releasePayload.minorVersion || undefined,
    patch_version: releasePayload.patchVersion || undefined,
    body: releasePayload.body,
  })
  core.info('Outputs set!')
}
