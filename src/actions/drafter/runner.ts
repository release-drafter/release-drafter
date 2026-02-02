import * as core from '@actions/core'
import { main } from './main'
import {
  getActionInput,
  getConfig,
  mergeInputAndConfig,
  setActionOutput
} from './config'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info('Parsing inputs and configuration...')
    const input = getActionInput()
    const config = mergeInputAndConfig({
      config: await getConfig(input['config-name']),
      input
    })

    const { upsertedRelease, releasePayload } = await main({ input, config })

    setActionOutput({
      upsertedRelease,
      releasePayload
    })
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
