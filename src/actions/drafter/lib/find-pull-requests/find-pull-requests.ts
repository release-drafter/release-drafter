import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  getGitHubAdapter,
  getOctokit,
  getRepository,
} from '#src/common/index.ts'
import { needsPullRequestChangedFiles } from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'

export const findPullRequests = async (params: {
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  config: ParsedConfig
}) => {
  if (!params.lastRelease?.tag_name) {
    core.warning('A previous (published) release is required to find changes')
    return {
      commits: [],
      newContributorLogins: new Set<string>(),
      pullRequests: [],
    }
  }

  const baseRef = `refs/tags/${params.lastRelease.tag_name}`
  core.info(
    `Finding commits between ${baseRef} and ${params.config.commitish}...`,
  )
  const changes = await getGitHubAdapter(getOctokit()).findChanges({
    repository: getRepository(),
    comparison: {
      baseRef,
      headRef: params.config.commitish,
    },
    pullRequestFields: {
      body: params.config['change-template'].includes('$BODY'),
      url: params.config['change-template'].includes('$URL'),
      baseRefName: params.config['change-template'].includes('$BASE_REF_NAME'),
      headRefName: params.config['change-template'].includes('$HEAD_REF_NAME'),
    },
    pullRequestLimit: params.config['pull-request-limit'],
    historyLimit: params.config['history-limit'],
    includeChangedFiles: needsPullRequestChangedFiles(params.config.categories),
    includeNewContributors: [
      params.config.header,
      params.config.template,
      params.config.footer,
    ].some((template) => template?.includes('$NEW_CONTRIBUTORS')),
  })

  core.info(`Found ${changes.commits.length} commits.`)
  core.info(
    `Found ${changes.pullRequests.length} merged pull requests targeting ${context.repo.owner}/${context.repo.repo}${
      changes.pullRequests.length > 0
        ? `: ${changes.pullRequests.map((pullRequest) => `#${pullRequest.number}`).join(', ')}`
        : '.'
    }`,
  )

  const rawPullRequests = changes.pullRequests.map((pullRequest) => ({
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
  }))
  const pullRequestsByKey = new Map(
    rawPullRequests.map((pullRequest) => [
      `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`,
      pullRequest,
    ]),
  )

  return {
    commits: changes.commits.map((commit) => ({
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
                ? (pullRequestsByKey.get(
                    `${pullRequest.baseRepository}#${pullRequest.number}`,
                  ) ?? {
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
    })),
    newContributorLogins: changes.newContributorLogins,
    pullRequests: rawPullRequests,
  }
}
