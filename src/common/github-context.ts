import { context } from '@actions/github'
import { getOctokit, type Octokit } from './get-octokit.ts'

export type GitHubContext = {
  repo: { owner: string; repo: string }
  ref?: string
  serverUrl: string
  octokit: Octokit
}

export const getGitHubContext = (): GitHubContext => ({
  repo: context.repo,
  ref: context.ref || (context.payload.ref as string | undefined),
  serverUrl: context.serverUrl,
  octokit: getOctokit(),
})
