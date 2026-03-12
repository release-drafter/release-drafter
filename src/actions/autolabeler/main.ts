import * as core from '@actions/core'
import { context } from '@actions/github'
import type { PullRequestEvent } from '@octokit/webhooks-types'
import ignore from 'ignore'
import { getOctokit } from 'src/common'
import type { ParsedConfig } from './config'

export const main = async (params: {
  config: ParsedConfig
  dryRun?: boolean
}) => {
  core.info(
    `Running for event "${context.eventName || '[undefined]'}.${context.payload.action || '[undefined]'}"`,
  )

  if (context.eventName !== 'pull_request') {
    throw new Error(
      `Event type is wrong. Expected 'pull_request', received '${context.eventName}'`,
    )
  }
  const octokit = getOctokit()

  /**
   * @see https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request
   */
  const payload = context.payload as PullRequestEvent

  const changedFiles = await octokit.paginate(
    octokit.rest.pulls.listFiles,
    {
      ...context.repo,
      issue_number: payload.number,
      pull_number: payload.number,
      per_page: 100,
    },
    (response) => response.data.map((file) => file.filename),
  )
  const labels = new Set<string>()

  for (const autolabel of params.config.autolabeler) {
    let found = false

    // check modified files
    if (!found && autolabel.files.length > 0) {
      const matcher = ignore().add(autolabel.files)
      if (changedFiles.some((file) => matcher.ignores(file))) {
        labels.add(autolabel.label)
        found = true
        core.info(`Found label for files: '${autolabel.label}'`)
      }
    }

    // check branch names
    if (!found && autolabel.branch.length > 0) {
      for (const matcher of autolabel.branch) {
        if (matcher.test(payload.pull_request.head.ref)) {
          labels.add(autolabel.label)
          found = true
          core.info(`Found label for branch: '${autolabel.label}'`)
          break
        }
      }
    }

    // check pr title
    if (!found && autolabel.title.length > 0) {
      for (const matcher of autolabel.title) {
        if (matcher.test(payload.pull_request.title)) {
          labels.add(autolabel.label)
          found = true
          core.info(`Found label for title: '${autolabel.label}'`)
          break
        }
      }
    }

    // check pr body
    if (
      !found &&
      payload.pull_request.body != null &&
      autolabel.body.length > 0
    ) {
      for (const matcher of autolabel.body) {
        if (matcher.test(payload.pull_request.body)) {
          labels.add(autolabel.label)
          found = true
          core.info(`Found label for body: '${autolabel.label}'`)
          break
        }
      }
    }
  }

  if (labels.size > 0) {
    if (params.dryRun) {
      core.info(
        `[dry-run] Would add labels [${Array.from(labels).join(', ')}] to PR #${payload.number}`,
      )
    } else {
      await octokit.rest.issues.addLabels({
        ...context.repo,
        issue_number: payload.number,
        labels: Array.from(labels),
      })
    }
  }

  return {
    pr_number: payload.number.toString(),
    labels: labels.size ? Array.from(labels).join(',') : undefined,
  }
}
