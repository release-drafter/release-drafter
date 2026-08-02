import process from 'node:process'
import * as core from '@actions/core'
import { context } from '@actions/github'
// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import type { Repository } from '@release-drafter/core'
import {
  createGitHubAdapter,
  type GitHubAdapter,
  type GitHubOctokit,
  // biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
} from '@release-drafter/github-adapter'

export const getRepository = (): Repository => ({
  owner: context.repo.owner,
  name: context.repo.repo,
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
})

export const getGitHubAdapter = (octokit?: GitHubOctokit): GitHubAdapter =>
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
