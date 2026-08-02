import * as core from '@actions/core'
import { context } from '@actions/github'
import type { PullRequestEvent } from '@octokit/webhooks-types'
import { matchLabels } from '@release-drafter/autolabeler'
import { getOctokit, getPullRequestChangedFiles } from '#src/common/index.ts'
import type { ParsedConfig } from './config/index.ts'

export const main = async (params: {
  config: ParsedConfig
  dryRun?: boolean
}) => {
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

  const octokit = getOctokit()
  const payload = context.payload as PullRequestEvent
  const changedFiles = await getPullRequestChangedFiles(octokit, {
    ...context.repo,
    pull_number: payload.number,
  })
  const result = matchLabels({
    config: params.config,
    pullRequest: {
      files: changedFiles,
      branch: payload.pull_request.head.ref,
      title: payload.pull_request.title,
      body: payload.pull_request.body,
    },
  })

  for (const match of result.matches) {
    core.info(`Found label for ${match.matcher}: '${match.label}'`)
  }

  if (result.labels.length > 0) {
    if (params.dryRun) {
      core.info(
        `[dry-run] Would add labels [${result.labels.join(', ')}] to PR #${payload.number}`,
      )
    } else {
      await octokit.rest.issues.addLabels({
        ...context.repo,
        issue_number: payload.number,
        labels: result.labels,
      })
    }
  }

  return {
    pr_number: payload.number.toString(),
    labels: result.labels.length ? result.labels.join(',') : undefined,
  }
}
