import { context } from '@actions/github'
import {
  generateAuthorsSentence as generateCoreAuthorsSentence,
  generateContributorsSentence as generateCoreContributorsSentence,
  generateNewContributorsList as generateCoreNewContributorsList,
} from '@release-drafter/core'
import type { ParsedConfig } from '../../config/index.ts'
import { toCoreCommit, toCorePullRequest } from '../core-compat.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

type PullRequestsResult = Awaited<ReturnType<typeof findPullRequests>>

export const generateContributorsSentence = (params: {
  commits: PullRequestsResult['commits']
  pullRequests: PullRequestsResult['pullRequests']
  config: Pick<
    ParsedConfig,
    'categories' | 'exclude-contributors' | 'no-contributors-template'
  >
}) =>
  generateCoreContributorsSentence({
    commits: params.commits.map(toCoreCommit),
    pullRequests: params.pullRequests.map(toCorePullRequest),
    serverUrl: context.serverUrl,
    config: params.config,
  })

export const generateAuthorsSentence = (params: {
  commits: PullRequestsResult['commits']
  pullRequests: PullRequestsResult['pullRequests']
  excludeContributors?: string[]
  noAuthorsTemplate?: string
  authorTemplate?: string
  authorsSeparator?: string
  authorsFinalSeparator?: string
}) =>
  generateCoreAuthorsSentence({
    commits: params.commits.map(toCoreCommit),
    pullRequests: params.pullRequests.map(toCorePullRequest),
    serverUrl: context.serverUrl,
    excludeContributors: params.excludeContributors,
    noAuthorsTemplate: params.noAuthorsTemplate,
    authorTemplate: params.authorTemplate,
    authorsSeparator: params.authorsSeparator,
    authorsFinalSeparator: params.authorsFinalSeparator,
  })

export const generateNewContributorsList = (params: {
  pullRequests: PullRequestsResult['pullRequests']
  newContributorLogins: ReadonlySet<string>
  config: Pick<
    ParsedConfig,
    | 'categories'
    | 'exclude-contributors'
    | 'new-contributor-template'
    | 'no-new-contributor-template'
  >
}) =>
  generateCoreNewContributorsList({
    pullRequests: params.pullRequests.map(toCorePullRequest),
    newContributorLogins: params.newContributorLogins,
    config: params.config,
  })
