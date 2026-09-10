import type { Logger } from '@release-drafter/core'

export type GitLabFetch = typeof globalThis.fetch

export type GitLabAdapterLimits = {
  timeoutMs: number
  maxResponseBytes: number
  maxComparisonBytes: number
  maxComparisonCommits: number
  maxPages: number
  pageSize: number
  maxItemsPerList: number
  maxChangedFiles: number
  maxRequestsPerOperation: number
  maxAssociatedMergeRequests: number
  concurrency: number
  retries: number
  retryBaseDelayMs: number
  maxRetryDelayMs: number
}

export type GitLabAdapterOptions = {
  token: string
  fetch?: GitLabFetch
  logger?: Logger
  serverUrl?: string
  apiUrl?: string
  limits?: Partial<GitLabAdapterLimits>
}

export const defaultGitLabAdapterLimits: GitLabAdapterLimits = {
  timeoutMs: 10_000,
  maxResponseBytes: 2 * 1024 * 1024,
  maxComparisonBytes: 10 * 1024 * 1024,
  maxComparisonCommits: 499,
  maxPages: 20,
  pageSize: 50,
  maxItemsPerList: 1_000,
  maxChangedFiles: 1_000,
  maxRequestsPerOperation: 500,
  maxAssociatedMergeRequests: 100,
  concurrency: 4,
  retries: 2,
  retryBaseDelayMs: 100,
  maxRetryDelayMs: 5_000,
}
