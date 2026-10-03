import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  evaluatePullRequest,
  matchesCategoryCondition,
  mergeInputAndConfig,
  type ParsedConfig,
  type PullRequestEvaluation,
} from '@release-drafter/core'
import { writeActionOutputs } from '../common/action-contract.ts'
import { ConfigError } from '../common/config/config-error.ts'
import { actionLogger } from '../common/github.ts'
import { actionOutputNames } from './action-metadata.ts'
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
      `Unsupported event \`${dependencies.eventName}\`. Expected \`pull_request\` or \`pull_request_target\`.`,
    )

  const pullRequest = parsePullRequestEvent(
    dependencies.eventName,
    dependencies.payload,
  )
  const input = dependencies.getInput()
  const snapshots = [
    { name: 'Base configuration', ref: pullRequest.baseRef },
    {
      name: 'Proposed configuration',
      ref: `refs/pull/${pullRequest.number}/head`,
    },
  ]
  const failures: string[] = []
  const evaluations: PullRequestEvaluation[] = []
  for (const snapshot of snapshots) {
    core.info(
      `${snapshot.name}: loading ${input['config-name']} (repository ref: ${snapshot.ref}).`,
    )
    try {
      const config = mergeInputAndConfig({
        config: await dependencies.getConfig(
          input['config-name'],
          input.token,
          snapshot.ref,
        ),
        input: {},
        defaultCommitish: pullRequest.baseRef,
        logger: actionLogger,
      })
      const evaluation = evaluatePullRequest(pullRequest, config.categories)
      evaluations.push(evaluation)
      if (!evaluation.valid) {
        logMatchingRules(pullRequest, config.categories)
        throw new Error(
          `No configured changelog or version-resolver category matches the title or labels of pull request #${pullRequest.number}. Path-only conditions and fallback categories cannot pass Check PR.`,
        )
      }
      core.info(
        evaluation.skipped
          ? `${snapshot.name}: skipping excluded pull request #${pullRequest.number}.`
          : `${snapshot.name}: pull request #${pullRequest.number} matches the configuration.`,
      )
    } catch (error) {
      const message = `${snapshot.name} (${snapshot.ref}): ${error instanceof Error ? error.message : String(error)}`
      failures.push(message)
      core.error(message, {
        ...(error instanceof ConfigError
          ? error.annotation(context.repo, snapshots[1].ref)
          : {}),
        title: `${snapshot.name}: Check PR failed`,
      })
    }
  }

  // Preserve the output's base-configuration meaning, even on a PR mismatch.
  if (evaluations.length === snapshots.length) {
    writeActionOutputs(actionOutputNames, {
      labels: JSON.stringify(evaluations[0].labels),
    })
  }
  if (failures.length > 0) throw new Error(failures.join('\n'))
}

const logMatchingRules = (
  pullRequest: { title: string; labels: string[] },
  categories: ParsedConfig['categories'],
): void => {
  core.info(`PR title: ${JSON.stringify(pullRequest.title)}`)
  core.info(`PR labels: ${JSON.stringify(pullRequest.labels)}`)
  categories.forEach((category, index) => {
    const name = 'title' in category ? category.title : undefined
    core.info(
      `Category ${index + 1}${name ? ` (${JSON.stringify(name)})` : ''}, type ${category.type}: ${JSON.stringify(category.when)}`,
    )
    if (category.when.length === 0)
      core.info('Fallback category: cannot satisfy Check PR on its own.')
    category.when.forEach((condition, conditionIndex) => {
      if (!condition.conventional && condition.labels.length === 0) {
        core.info(`Condition ${conditionIndex + 1}: ignored (path-only).`)
        return
      }
      const titleMatches = matchesCategoryCondition(
        { ...condition, paths: [], labels: [] },
        pullRequest,
      )
      const labelsMatch = matchesCategoryCondition(
        { ...condition, paths: [], conventional: undefined },
        pullRequest,
      )
      core.info(
        `Condition ${conditionIndex + 1}: title ${titleMatches ? 'matches' : 'does not match'}, labels ${labelsMatch ? 'match' : 'do not match'}. Path predicates are ignored.`,
      )
    })
  })
}

export async function run(): Promise<void> {
  try {
    await checkPullRequest()
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}
