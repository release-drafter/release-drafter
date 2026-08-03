import process from 'node:process'
import * as core from '@actions/core'
import { context } from '@actions/github'
import type { Repository } from '@release-drafter/core'
import {
  createGitHubAdapter,
  type GitHubAdapter,
  type GitHubAdapterOptions,
  type GitHubOctokit,
} from '@release-drafter/github-adapter'

export const actionLogger = {
  debug: core.debug,
  info: core.info,
  warning: core.warning,
  error: core.error,
}

export const getRepository = (): Repository => ({
  owner: context.repo.owner,
  name: context.repo.repo,
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
})

export const getGitHubAdapterOptions = (
  token: string,
  octokit?: GitHubOctokit,
): GitHubAdapterOptions => ({
  token,
  serverUrl: process.env.GITHUB_SERVER_URL,
  apiUrl: process.env.GITHUB_API_URL,
  graphqlUrl: process.env.GITHUB_GRAPHQL_URL,
  logger: actionLogger,
  octokit,
  ...(process.env.VITEST
    ? {
        fetch: ((input, init) => globalThis.fetch(input, init)) as typeof fetch,
        requestRetries: 0,
        ...((process.env.HTTPS_PROXY ?? process.env.https_proxy)
          ? { requestAgent: {} }
          : {}),
      }
    : {}),
})

export const getGitHubAdapter = (
  token: string,
  octokit?: GitHubOctokit,
  factory: (
    options: GitHubAdapterOptions,
  ) => GitHubAdapter = createGitHubAdapter,
): GitHubAdapter => factory(getGitHubAdapterOptions(token, octokit))
