import * as core from '@actions/core'
import { drafter } from './drafter/index.js'
import { autolabeler } from './autolabeler/index.js'
import { getActionInput } from './utils/get-action-inputs.js'
import { mergeInputAndConfig } from './utils/merge-input-and-config.js'
import { parseConfigFile } from './utils/parse-config-file.js'
import { loadConfigFile } from './utils/load-config-file.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const input = getActionInput()
    const config = mergeInputAndConfig({
      config: await parseConfigFile(loadConfigFile(input['config-name'])),
      input
    })

    if (!input['disable-releaser']) {
      await drafter({ input, config })
    } else {
      core.info(`disable-releaser set to true. Ignoring the drafter.`)
    }

    if (!input['disable-autolabeler']) {
      await autolabeler({ input, config })
    } else {
      core.info(`disable-autolabeler set to true. Ignoring the autolabeler.`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
