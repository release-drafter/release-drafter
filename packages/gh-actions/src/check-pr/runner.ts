import * as core from '@actions/core'
import { context } from '@actions/github'
import { evaluatePullRequest, mergeInputAndConfig } from '@release-drafter/core'
import { actionLogger } from '../common/github.ts'
import { parsePullRequestEvent } from './event.ts'
import { getActionInput } from './get-action-inputs.ts'
import { getConfig } from './get-config.ts'

export type RunnerDependencies = {
  eventName: string
  payload: unknown
  getInput: typeof getActionInput
  getConfig: typeof getConfig
}

const defaultDependencies = (): RunnerDependencies => ({
  eventName: context.eventName,
  payload: context.payload,
  getInput: getActionInput,
  getConfig,
})

/** Check the current pull request without performing any write operation. */
export async function checkPullRequest(
  dependencies: RunnerDependencies = defaultDependencies(),
): Promise<void> {
  if (
    dependencies.eventName !== 'pull_request' &&
    dependencies.eventName !== 'pull_request_target'
  )
    throw new Error(
      `Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${dependencies.eventName}'`,
    )

  const pullRequest = parsePullRequestEvent(
    dependencies.eventName,
    dependencies.payload,
  )
  const input = dependencies.getInput()
  const config = mergeInputAndConfig({
    config: await dependencies.getConfig(input['config-name'], input.token),
    input: {},
    defaultCommitish: pullRequest.baseRef,
    logger: actionLogger,
  })
  const evaluation = evaluatePullRequest(
    {
      title: pullRequest.title,
      labels: pullRequest.labels,
    },
    config.categories,
  )

  if (evaluation.skipped) {
    core.info(`Skipping excluded pull request #${pullRequest.number}.`)
    return
  }
  if (!evaluation.valid)
    throw new Error(
      `Pull request #${pullRequest.number} does not match any configured conventional or label-based changelog or version-resolver category.`,
    )

  core.info(`Pull request #${pullRequest.number} matches the configuration.`)
}

export async function run(): Promise<void> {
  try {
    await checkPullRequest()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
