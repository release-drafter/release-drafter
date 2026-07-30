import * as core from '@actions/core'
import { context } from '@actions/github'
import type { PullRequestEvent } from '@octokit/webhooks-types'
import { getActionOctokit } from '#src/actions/get-octokit.ts'
import { getActionInput, getConfig, parseConfig } from './config/index.ts'
import { main } from './main.ts'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const input = getActionInput()
    const github = {
      logger: core,
      octokit: getActionOctokit(input.token),
      ref: context.ref,
      repo: context.repo,
    }
    const config = parseConfig({
      config: await getConfig(input['config-name'], github),
      logger: core,
    })

    const { labels, pr_number } = await main({
      config,
      dryRun: input['dry-run'],
      eventName: context.eventName,
      payload: context.payload as PullRequestEvent,
      github,
    })

    if (pr_number) core.setOutput('number', pr_number)
    if (labels) core.setOutput('labels', labels)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
