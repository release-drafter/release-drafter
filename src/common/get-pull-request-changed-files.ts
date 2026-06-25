import type { Octokit } from './get-octokit.ts'
import { getOctokit } from './get-octokit.ts'

const PULL_REQUEST_FILES_PER_PAGE = 50

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
  // Octokit follows the REST pagination links for us; per_page only controls
  // how many files each HTTP request retrieves.
  octokit.paginate(
    octokit.rest.pulls.listFiles,
    {
      ...params,
      per_page: PULL_REQUEST_FILES_PER_PAGE,
    },
    (response) => response.data.map((file) => file.filename),
  )

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
