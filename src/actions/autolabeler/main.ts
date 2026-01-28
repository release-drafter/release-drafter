import * as core from '@actions/core'
import { Config } from './config'
import { context } from '@actions/github'
import { PullRequestEvent } from '@octokit/webhooks-types'
import { getOctokit } from 'src/common'
import ignore from 'ignore'

export const main = async (params: { config: Config }) => {
  /**
   * TODO :
   *
   * 1. [new] check event is 'pull_request' - was handled by probot using app.on()
   * 2. get PR's details. I think @actions/github's context is fine
   * 3. find changed files. @actions/github's octokit instance may be useful
   * 4. create Set() of labels to add based on config's autolabeler params
   * 5. add labels. @actions/github's octokit instance may be useful
   */
  core.info(
    `Running for event "${context.eventName || '[undefined]'}.${context.payload.action || '[undefined]'}"`
  )

  if (context.eventName !== 'pull_request') {
    throw new Error(
      `Event type is wrong. Expected 'pull_request', recieved '${context.eventName}'`
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
      per_page: 100
    },
    (response) => response.data.map((file) => file.filename)
  )
  const labels = new Set<string>()

  for (const autolabel of params.config['autolabeler']) {
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
    await octokit.rest.issues.addLabels({
      ...context.repo,
      issue_number: payload.number,
      labels: Array.from(labels)
    })
  }

  return {
    pr_number: payload.number.toString(),
    labels: labels.size ? Array.from(labels).join(',') : undefined
  }
}
