import type { Commit, PullRequest, Release } from '@release-drafter/core'
import type { GraphCommit, GraphPullRequest } from '../types/github.ts'

export const normalizeRelease = (release: {
  id: string | number
  tag_name: string
  name?: string | null
  target_commitish?: string
  created_at?: string
  draft?: boolean
  prerelease?: boolean
  html_url?: string
  upload_url?: string
}): Release => ({
  id: release.id,
  tagName: release.tag_name,
  name: release.name,
  targetCommitish: release.target_commitish,
  createdAt: release.created_at,
  draft: release.draft,
  prerelease: release.prerelease,
  url: release.html_url,
  uploadUrl: release.upload_url,
})

export const normalizePullRequest = (
  pullRequest: GraphPullRequest,
): PullRequest => ({
  number: pullRequest.number,
  title: pullRequest.title,
  body: pullRequest.body,
  url: pullRequest.url,
  mergedAt: pullRequest.mergedAt,
  baseRefName: pullRequest.baseRefName,
  headRefName: pullRequest.headRefName,
  baseRepository: pullRequest.baseRepository?.nameWithOwner ?? null,
  isCrossRepository: pullRequest.isCrossRepository,
  author: pullRequest.author
    ? {
        login: pullRequest.author.login,
        url: pullRequest.author.url,
        type: pullRequest.author.__typename,
      }
    : pullRequest.author,
  labels: (pullRequest.labels?.nodes ?? []).flatMap((label) =>
    label?.name ? [label.name] : [],
  ),
  mergeCommitOid: pullRequest.mergeCommit?.oid,
})

export const normalizeCommit = (commit: GraphCommit): Commit => ({
  id: commit.id,
  oid: commit.oid,
  committedAt: commit.committedDate,
  message: commit.message,
  author: commit.author
    ? {
        name: commit.author.name,
        login: commit.author.user?.login,
        type: 'User',
      }
    : commit.author,
  authors: commit.authors
    ? (commit.authors.nodes ?? []).map((author) =>
        author
          ? { name: author.name, login: author.user?.login, type: 'User' }
          : author,
      )
    : commit.authors,
  associatedPullRequests: commit.associatedPullRequests
    ? (commit.associatedPullRequests.nodes ?? []).map((pullRequest) =>
        pullRequest
          ? {
              number: pullRequest.number,
              baseRepository: pullRequest.baseRepository?.nameWithOwner ?? null,
            }
          : pullRequest,
      )
    : commit.associatedPullRequests,
})
