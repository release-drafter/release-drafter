import * as core from '@actions/core'
import { context } from '@actions/github'
import { getOctokit } from '#src/common/index.ts'
import {
  getActionInput,
  getConfig,
  mergeInputAndConfig,
  setActionOutput,
} from './config/index.ts'
import { main } from './main.ts'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info('Parsing inputs and configuration...')
    const input = getActionInput()
    const github = {
      repo: context.repo,
      ref: context.ref || (context.payload.ref as string | undefined),
      serverUrl: context.serverUrl,
      octokit: getOctokit(input.token),
    }
    const config = mergeInputAndConfig({
      config: await getConfig(input['config-name'], github),
      input,
      ref: github.ref,
    })

    const { upsertedRelease, releasePayload } = await main({
      input,
      config,
      github,
    })

    setActionOutput({
      upsertedRelease,
      releasePayload,
    })
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
