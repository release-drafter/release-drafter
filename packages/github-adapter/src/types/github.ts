import type { Logger, Repository } from '@release-drafter/core'
import type { GitHubOctokit } from '../utils/octokit.ts'

export type GitHubFetch = typeof globalThis.fetch

export type GitHubAdapterOptions = {
  token: string
  serverUrl?: string
  apiUrl?: string
  graphqlUrl?: string
  logger?: Logger
  octokit?: GitHubOctokit
  fetch?: GitHubFetch
  env?: NodeJS.ProcessEnv
  requestAgent?: object
  requestRetries?: number
  changedFilesConcurrency?: number
  contributorConcurrency?: number
}

export type RepositoryConfigRequest = {
  repository: Repository
  path: string
  ref?: string
}

export type GraphPullRequest = {
  number: number
  title: string
  body?: string | null
  url?: string
  mergedAt?: string | null
  baseRefName?: string
  headRefName?: string
  baseRepository?: { nameWithOwner?: string | null } | null
  isCrossRepository?: boolean
  author?: { __typename?: string; login: string; url?: string } | null
  labels?: { nodes?: Array<{ name?: string | null } | null> | null } | null
  merged?: boolean
  mergeCommit?: { oid?: string | null } | null
}

export type GraphCommit = {
  id?: string
  oid: string
  committedDate?: string
  message?: string
  author?: {
    name?: string | null
    user?: { login?: string | null } | null
  } | null
  authors?: {
    nodes?: Array<{
      name?: string | null
      user?: { login?: string | null } | null
    } | null> | null
  } | null
  associatedPullRequests?: {
    nodes?: Array<GraphPullRequest | null> | null
  } | null
}
