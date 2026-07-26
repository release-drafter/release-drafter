import type { Octokit } from './get-octokit.ts'
import type { Logger } from './logger.ts'

export type GitHubContext = {
  repo: { owner: string; repo: string }
  ref?: string
  serverUrl: string
  octokit: Octokit
  logger: Logger
}
