import type {
  Commit,
  PullRequest,
  Release,
  ReleasePayload,
} from '@release-drafter/core'
import type { findPreviousReleases } from './find-previous-releases/index.ts'
import type { findPullRequests } from './find-pull-requests/index.ts'

type RawPullRequest = Awaited<
  ReturnType<typeof findPullRequests>
>['pullRequests'][number]
type RawCommit = Awaited<ReturnType<typeof findPullRequests>>['commits'][number]
type RawRelease = NonNullable<
  | Awaited<ReturnType<typeof findPreviousReleases>>['draftRelease']
  | Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
>

export const toCorePullRequest = (
  pullRequest: RawPullRequest,
): PullRequest => ({
  number: pullRequest.number,
  title: pullRequest.title,
  body: pullRequest.body,
  url: pullRequest.url,
  mergedAt: pullRequest.mergedAt,
  baseRefName: pullRequest.baseRefName,
  headRefName: pullRequest.headRefName,
  baseRepository: pullRequest.baseRepository?.nameWithOwner,
  author: pullRequest.author
    ? {
        login: pullRequest.author.login,
        url: pullRequest.author.url,
        type: pullRequest.author.__typename,
      }
    : pullRequest.author,
  labels: (pullRequest.labels?.nodes ?? [])
    .map((label) => label?.name)
    .filter((name): name is string => Boolean(name)),
  changedFiles:
    'changedFiles' in pullRequest ? pullRequest.changedFiles : undefined,
  mergeCommitOid:
    'mergeCommit' in pullRequest && pullRequest.mergeCommit
      ? pullRequest.mergeCommit.oid
      : undefined,
})

export const toCoreCommit = (commit: RawCommit): Commit => ({
  oid: commit.oid,
  author: commit.author
    ? {
        name: commit.author.name,
        login: commit.author.user?.login,
      }
    : commit.author,
  authors: commit.authors
    ? (commit.authors.nodes ?? []).map((author) =>
        author
          ? {
              name: author.name,
              login: author.user?.login,
            }
          : author,
      )
    : commit.authors,
  associatedPullRequests: commit.associatedPullRequests
    ? (commit.associatedPullRequests.nodes ?? []).map((pullRequest) =>
        pullRequest
          ? {
              number: pullRequest.number,
              baseRepository: pullRequest.baseRepository?.nameWithOwner,
            }
          : pullRequest,
      )
    : commit.associatedPullRequests,
})

export const toCoreRelease = (release: RawRelease): Release => ({
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

export const toLegacyReleasePayload = (payload: ReleasePayload) => {
  const { makeLatest, ...legacyPayload } = payload
  return { ...legacyPayload, make_latest: makeLatest }
}
