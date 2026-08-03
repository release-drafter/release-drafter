import process from 'node:process'
import * as core from '@actions/core'
import { context } from '@actions/github'
import type { PullRequestEvent } from '@octokit/webhooks-types'
import { matchLabels } from '@release-drafter/autolabeler'
import { getGitHubAdapter } from '../common/github.ts'
import { getActionInput } from './get-action-inputs.ts'
import { getConfig } from './get-config.ts'

/** Run the Autolabeler Action using package-owned config and matching logic. */
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
    const payload = context.payload as PullRequestEvent
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
    core.setOutput('number', payload.number.toString())
    if (result.labels.length > 0)
      core.setOutput('labels', result.labels.join(','))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
