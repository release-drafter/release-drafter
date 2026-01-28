import * as core from '@actions/core'
import { main } from './main'
import {
  getActionInput,
  loadConfigFile,
  mergeInputAndConfig,
  parseConfigFile
} from 'src/common'
import { setActionOutput } from './config'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info('Parsing inputs and configuration...')
    /**
     * TODO loading config should not come from utils but from drafter directly
     */
    const input = getActionInput()
    const config = mergeInputAndConfig({
      config: await parseConfigFile(loadConfigFile(input['config-name'])),
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
