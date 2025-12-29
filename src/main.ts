import * as core from '@actions/core'
import { context } from '@actions/github'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(`Event name  : ${context.eventName}`)
    core.debug(`Event ref   : ${context.payload.ref}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
