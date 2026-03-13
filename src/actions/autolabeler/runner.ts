import * as core from '@actions/core'
import { getActionInput, getConfig, parseConfig } from './config'
import { main } from './main'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const input = getActionInput()
    const config = parseConfig({
      config: await getConfig(input['config-name']),
    })

    const { labels, pr_number } = await main({
      config,
      dryRun: input['dry-run'],
    })

    if (pr_number) core.setOutput('number', pr_number)
    if (labels) core.setOutput('labels', labels)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
