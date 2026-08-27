import process from 'node:process'
import * as core from '@actions/core'
import { context } from '@actions/github'
import type { Repository } from '@release-drafter/core'
import {
  createGitHubAdapter,
  type GitHubAdapter,
  type GitHubOctokit,
} from '@release-drafter/github-adapter'

export const getRepository = (): Repository => ({
  owner: context.repo.owner,
  name: context.repo.repo,
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
})

let defaultAdapter: GitHubAdapter | undefined

const createAdapter = (octokit?: GitHubOctokit): GitHubAdapter =>
  createGitHubAdapter({
    token: process.env.GITHUB_TOKEN ?? (octokit ? 'injected-client' : ''),
    serverUrl: process.env.GITHUB_SERVER_URL,
    apiUrl: process.env.GITHUB_API_URL,
    graphqlUrl: process.env.GITHUB_GRAPHQL_URL,
    logger: {
      debug: core.debug,
      info: core.info,
      warning: core.warning,
      error: core.error,
    },
    octokit,
    ...(process.env.VITEST
      ? {
          fetch: ((input, init) =>
            globalThis.fetch(input, init)) as typeof fetch,
          requestRetries: 0,
          ...((process.env.HTTPS_PROXY ?? process.env.https_proxy)
            ? { requestAgent: {} }
            : {}),
        }
      : {}),
  })

/**
 * Returns the adapter shared by one Action process. An injected Octokit client
 * still gets its own adapter unless it belongs to the shared instance.
 */
export const getGitHubAdapter = (octokit?: GitHubOctokit): GitHubAdapter => {
  if (octokit) {
    if (defaultAdapter && defaultAdapter.octokit === octokit)
      return defaultAdapter
    return createAdapter(octokit)
  }

  if (!defaultAdapter) defaultAdapter = createAdapter()
  return defaultAdapter
}
