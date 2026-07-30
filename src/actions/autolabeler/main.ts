import type { PullRequestEvent } from '@octokit/webhooks-types'
import ignore from 'ignore'
import {
  type GitHubContext,
  getPullRequestChangedFiles,
} from '#src/common/index.ts'
import type { ParsedConfig } from './config/index.ts'

export const main = async (params: {
  config: ParsedConfig
  dryRun?: boolean
  eventName: string
  payload: PullRequestEvent
  github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo'>
}) => {
  const { logger, octokit, repo } = params.github
  logger.info(
    `Running for event "${params.eventName || '[undefined]'}.${params.payload.action || '[undefined]'}"`,
  )

  if (
    params.eventName !== 'pull_request' &&
    params.eventName !== 'pull_request_target'
  ) {
    throw new Error(
      `Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${params.eventName}'`,
    )
  }

  const payload = params.payload

  const changedFiles = await getPullRequestChangedFiles(octokit, {
    ...repo,
    pull_number: payload.number,
  })
  const labels = new Set<string>()

  for (const autolabel of params.config.autolabeler) {
    let found = false

    // check modified files
    if (!found && autolabel.files.length > 0) {
      const matcher = ignore().add(autolabel.files)
      if (changedFiles.some((file) => matcher.ignores(file))) {
        labels.add(autolabel.label)
        found = true
        logger.info(`Found label for files: '${autolabel.label}'`)
      }
    }

    // check branch names
    if (!found && autolabel.branch.length > 0) {
      for (const matcher of autolabel.branch) {
        if (matcher.test(payload.pull_request.head.ref)) {
          labels.add(autolabel.label)
          found = true
          logger.info(`Found label for branch: '${autolabel.label}'`)
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
          logger.info(`Found label for title: '${autolabel.label}'`)
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
          logger.info(`Found label for body: '${autolabel.label}'`)
          break
        }
      }
    }
  }

  if (labels.size > 0) {
    if (params.dryRun) {
      logger.info(
        `[dry-run] Would add labels [${Array.from(labels).join(', ')}] to PR #${payload.number}`,
      )
    } else {
      await octokit.rest.issues.addLabels({
        ...repo,
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
