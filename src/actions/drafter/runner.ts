import * as core from '@actions/core'
import { context } from '@actions/github'
import { getActionOctokit } from '#src/actions/get-octokit.ts'
import { resolveRestOnly } from '#src/common/resolve-api-mode.ts'
import {
  getActionInput,
  getConfig,
  mergeInputAndConfig,
  setActionOutput,
} from './config/index.ts'
import { main } from './main.ts'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info('⚙️ Parsing inputs and configuration...')
    const input = getActionInput()
    // Gitea and Forgejo runners set `GITHUB_ACTIONS` and `CI` exactly as GitHub
    // does, so neither identifies the forge. What separates them is
    // `GITHUB_GRAPHQL_URL`: GitHub and GitHub Enterprise Server populate it,
    // those two send it empty, which is the capability being branched on rather
    // than a product name or version.
    const restOnly = resolveRestOnly({ apiUrl: context.apiUrl })
    const github = {
      repo: context.repo,
      ref: context.ref || (context.payload.ref as string | undefined),
      serverUrl: context.serverUrl,
      octokit: getActionOctokit(input.token),
      logger: core,
      restOnly,
    }
    if (restOnly) {
      core.info('🔌 No GraphQL API detected; using REST-only code paths.')
    }
    const config = mergeInputAndConfig({
      config: await getConfig(input['config-name'], github),
      input,
      logger: github.logger,
      ref: github.ref,
    })

    const result = await main({
      input,
      config,
      github,
    })

    setActionOutput(result)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
