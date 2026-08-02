import process from 'node:process'
import { getGitHubAdapter } from './get-github-adapter.ts'
import type { Octokit } from './get-octokit.ts'
import { getOctokit } from './get-octokit.ts'

type PullRequestRef = {
  number: number
  baseRepository?: {
    nameWithOwner?: string | null
  } | null
}

export const getPullRequestChangedFiles = async (
  octokit: Octokit,
  params: {
    owner: string
    repo: string
    pull_number: number
  },
) =>
  getGitHubAdapter(octokit).findPullRequestChangedFiles({
    repository: {
      owner: params.owner,
      name: params.repo,
      serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
    },
    number: params.pull_number,
  })

export const getPullRequestsChangedFiles = async (params: {
  owner: string
  repo: string
  pullRequests: PullRequestRef[]
  octokit?: Octokit
}) => {
  const octokit = params.octokit ?? getOctokit()
  const changedFileEntries = await Promise.all(
    params.pullRequests.map(async (pullRequest) => {
      const key = `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`

      try {
        const changedFiles = await getPullRequestChangedFiles(octokit, {
          owner: params.owner,
          repo: params.repo,
          pull_number: pullRequest.number,
        })

        return [key, changedFiles] as const
      } catch (error) {
        throw new Error(
          `Failed to list changed files for pull request #${pullRequest.number}.`,
          {
            cause: error,
          },
        )
      }
    }),
  )

  return new Map(changedFileEntries)
}
