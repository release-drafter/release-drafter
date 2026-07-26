import * as core from '@actions/core'
import { getReleaseOutput } from './get-release-output.ts'

export const setActionOutput = (
  params: Parameters<typeof getReleaseOutput>[0],
) => {
  core.info('Set action outputs...')

  for (const [name, value] of Object.entries(getReleaseOutput(params))) {
    core.setOutput(name, value.toString())
  }

  core.info('Outputs set!')
}
