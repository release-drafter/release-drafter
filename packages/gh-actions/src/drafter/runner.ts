import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  draftRelease,
  mergeInputAndConfig,
  type ReleaseInput,
} from '@release-drafter/core'
import {
  actionLogger,
  getGitHubAdapter,
  getRepository,
} from '../common/github.ts'
import type { ActionInput } from './action-input.schema.ts'
import { getActionInput } from './get-action-inputs.ts'
import { getConfig } from './get-config.ts'
import { setActionOutput } from './set-action-output.ts'

export const toReleaseInput = (input: ActionInput): ReleaseInput => ({
  ...(input.from !== undefined ? { from: input.from } : {}),
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.tag !== undefined ? { tag: input.tag } : {}),
  ...(input.version !== undefined ? { version: input.version } : {}),
  publish: input.publish,
  ...(input['dry-run'] !== undefined ? { dryRun: input['dry-run'] } : {}),
})

/** Run the Drafter Action using core orchestration and the GitHub adapter. */
export async function run(): Promise<void> {
  try {
    core.info('Parsing inputs and configuration...')
    const input = getActionInput()
    const config = mergeInputAndConfig({
      config: await getConfig(input['config-name'], input.token),
      input,
      defaultCommitish: context.ref || (context.payload.ref as string),
      logger: actionLogger,
    })
    const result = await draftRelease({
      adapter: getGitHubAdapter(input.token),
      config,
      input: toReleaseInput(input),
      logger: actionLogger,
      repository: getRepository(),
    })
    setActionOutput(result)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
