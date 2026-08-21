import type { Commit, PullRequest } from '@release-drafter/core'

export const toLegacyPullRequest = (pullRequest: PullRequest) => ({
  __typename: 'PullRequest' as const,
  title: pullRequest.title,
  number: pullRequest.number,
  url: pullRequest.url,
  body: pullRequest.body,
  author: pullRequest.author
    ? {
        __typename: pullRequest.author.type,
        login: pullRequest.author.login,
        url: pullRequest.author.url,
      }
    : pullRequest.author,
  baseRepository: pullRequest.baseRepository
    ? {
        __typename: 'Repository' as const,
        nameWithOwner: pullRequest.baseRepository,
      }
    : null,
  mergedAt: pullRequest.mergedAt,
  isCrossRepository: pullRequest.isCrossRepository ?? false,
  labels: {
    __typename: 'LabelConnection' as const,
    nodes: (pullRequest.labels ?? []).map((name) => ({
      __typename: 'Label' as const,
      name,
    })),
  },
  merged: true,
  baseRefName: pullRequest.baseRefName,
  headRefName: pullRequest.headRefName,
  ...(pullRequest.mergeCommitOid
    ? {
        mergeCommit: {
          __typename: 'Commit' as const,
          oid: pullRequest.mergeCommitOid,
        },
      }
    : {}),
  ...(pullRequest.changedFiles
    ? { changedFiles: pullRequest.changedFiles }
    : {}),
})

export type LegacyPullRequest = ReturnType<typeof toLegacyPullRequest>

export const legacyPullRequestKey = (
  pullRequest: Pick<PullRequest, 'number' | 'baseRepository'>,
) => `${pullRequest.baseRepository}#${pullRequest.number}`

export const toLegacyCommit = (
  commit: Commit,
  pullRequestsByKey: ReadonlyMap<string, LegacyPullRequest>,
) => ({
  __typename: 'Commit' as const,
  id: commit.id,
  oid: commit.oid,
  committedDate: commit.committedAt,
  message: commit.message,
  author: commit.author
    ? {
        __typename: 'GitActor' as const,
        name: commit.author.name,
        user: commit.author.login
          ? { __typename: 'User' as const, login: commit.author.login }
          : null,
      }
    : commit.author,
  authors: commit.authors
    ? {
        __typename: 'GitActorConnection' as const,
        nodes: commit.authors.map((author) =>
          author
            ? {
                __typename: 'GitActor' as const,
                name: author.name,
                user: author.login
                  ? { __typename: 'User' as const, login: author.login }
                  : null,
              }
            : author,
        ),
      }
    : commit.authors,
  associatedPullRequests: commit.associatedPullRequests
    ? {
        __typename: 'PullRequestConnection' as const,
        nodes: commit.associatedPullRequests.map((pullRequest) =>
          pullRequest
            ? (pullRequestsByKey.get(legacyPullRequestKey(pullRequest)) ?? {
                number: pullRequest.number,
                baseRepository: pullRequest.baseRepository
                  ? {
                      __typename: 'Repository' as const,
                      nameWithOwner: pullRequest.baseRepository,
                    }
                  : null,
              })
            : pullRequest,
        ),
      }
    : commit.associatedPullRequests,
})
