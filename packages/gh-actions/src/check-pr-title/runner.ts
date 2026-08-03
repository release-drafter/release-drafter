import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  mergeInputAndConfig,
  needsPullRequestChangedFiles,
} from '@release-drafter/core'
import {
  actionLogger,
  getGitHubAdapter,
  getRepository,
} from '../common/github.ts'
import {
  canSkipWithoutChangedFiles,
  evaluatePullRequestTitle,
  projectTitleCategories,
} from './evaluate-title.ts'
import { parsePullRequestEvent } from './event.ts'
import { getActionInput } from './get-action-inputs.ts'
import { getConfig } from './get-config.ts'

export type RunnerDependencies = {
  eventName: string
  payload: unknown
  getInput: typeof getActionInput
  getConfig: typeof getConfig
  getAdapter: (
    token: string,
  ) => Pick<ReturnType<typeof getGitHubAdapter>, 'findPullRequestChangedFiles'>
  repository: ReturnType<typeof getRepository>
}

const defaultDependencies = (): RunnerDependencies => ({
  eventName: context.eventName,
  payload: context.payload,
  getInput: getActionInput,
  getConfig,
  getAdapter: getGitHubAdapter,
  repository: getRepository(),
})

/** Check the current pull request title without performing any write operation. */
export async function checkPullRequestTitle(
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
  const pullRequestWithoutFiles = {
    title: pullRequest.title,
    labels: pullRequest.labels,
  }
  const titleCategories = projectTitleCategories(config.categories)
  if (canSkipWithoutChangedFiles(pullRequestWithoutFiles, titleCategories)) {
    core.info(`Skipping excluded pull request #${pullRequest.number}.`)
    return
  }

  const changedFiles = needsPullRequestChangedFiles(titleCategories)
    ? await dependencies.getAdapter(input.token).findPullRequestChangedFiles({
        repository: dependencies.repository,
        number: pullRequest.number,
      })
    : []
  const evaluation = evaluatePullRequestTitle(
    {
      title: pullRequest.title,
      labels: pullRequest.labels,
      changedFiles,
    },
    titleCategories,
  )

  if (evaluation.skipped) {
    core.info(`Skipping excluded pull request #${pullRequest.number}.`)
    return
  }
  if (!evaluation.valid)
    throw new Error(
      `Pull request #${pullRequest.number} title '${pullRequest.title}' does not match any configured conventional changelog or version-resolver category.`,
    )

  core.info(
    `Pull request #${pullRequest.number} title matches the configuration.`,
  )
}

export async function run(): Promise<void> {
  try {
    await checkPullRequestTitle()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
