import process from 'node:process'
import * as core from '@actions/core'
import { context } from '@actions/github'
import type { components } from '@octokit/openapi-webhooks-types'
import { matchLabels } from '@release-drafter/autolabeler'
import { writeActionOutputs } from '../common/action-contract.ts'
import { getGitHubAdapter } from '../common/github.ts'
import { actionOutputNames } from './action-metadata.ts'
import { getActionInput } from './get-action-inputs.ts'
import { getConfig } from './get-config.ts'

type PullRequestPayload = Pick<
  components['schemas']['webhook-pull-request-opened'],
  'number' | 'pull_request'
>

/** Run the Autolabeler action using package-owned config and matching logic. */
export async function run(): Promise<void> {
  try {
    const input = getActionInput()
    const config = await getConfig(input['config-name'], input.token)
    core.info(
      `Running for event "${context.eventName || '[undefined]'}.${context.payload.action || '[undefined]'}"`,
    )
    if (
      context.eventName !== 'pull_request' &&
      context.eventName !== 'pull_request_target'
    ) {
      throw new Error(
        `Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${context.eventName}'`,
      )
    }

    const adapter = getGitHubAdapter(input.token)
    const payload = context.payload as PullRequestPayload
    const files = await adapter.findPullRequestChangedFiles({
      repository: {
        owner: context.repo.owner,
        name: context.repo.repo,
        serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
      },
      number: payload.number,
    })
    const result = matchLabels({
      config,
      pullRequest: {
        files,
        branch: payload.pull_request.head.ref,
        title: payload.pull_request.title,
        body: payload.pull_request.body,
      },
    })

    for (const match of result.matches)
      core.info(`Found label for ${match.matcher}: '${match.label}'`)

    const labelsToRemove: string[] = []
    if (config['sync-labels']) {
      const currentLabels = await adapter.octokit.paginate(
        adapter.octokit.rest.issues.listLabelsOnIssue,
        { ...context.repo, issue_number: payload.number, per_page: 100 },
      )
      const managedLabels = new Set(
        config.autolabeler.flatMap((rule) =>
          rule.labels.map((label) => label.toLowerCase()),
        ),
      )
      const selectedLabels = new Set(
        result.labels.map((label) => label.toLowerCase()),
      )
      for (const { name } of currentLabels) {
        if (
          managedLabels.has(name.toLowerCase()) &&
          !selectedLabels.has(name.toLowerCase())
        )
          labelsToRemove.push(name)
      }
    }

    if (result.labels.length > 0) {
      if (input['dry-run']) {
        core.info(
          `[dry-run] Would add labels [${result.labels.join(', ')}] to PR #${payload.number}`,
        )
      } else {
        await adapter.octokit.rest.issues.addLabels({
          ...context.repo,
          issue_number: payload.number,
          labels: result.labels,
        })
      }
    }
    for (const name of labelsToRemove) {
      if (input['dry-run']) {
        core.info(
          `[dry-run] Would remove label '${name}' from PR #${payload.number}`,
        )
      } else {
        await adapter.octokit.rest.issues.removeLabel({
          ...context.repo,
          issue_number: payload.number,
          name,
        })
        core.info(`Removed label '${name}' from PR #${payload.number}`)
      }
    }
    writeActionOutputs(actionOutputNames, {
      number: payload.number.toString(),
      labels: result.labels.length > 0 ? result.labels.join(',') : undefined,
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
