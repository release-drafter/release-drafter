import * as core from '@actions/core'
import { context } from '@actions/github'
import type { GitHubAdapter } from '@release-drafter/github-adapter'
import { getGitHubAdapter, getRepository } from '#src/common/index.ts'
import { needsPullRequestChangedFiles } from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import {
  legacyPullRequestKey,
  toLegacyCommit,
  toLegacyPullRequest,
} from './core-to-legacy.ts'

export const findPullRequests = async (
  params: {
    lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
    config: ParsedConfig
  },
  adapter: Pick<GitHubAdapter, 'findChanges'> = getGitHubAdapter(),
) => {
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
  const changes = await adapter.findChanges({
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

  const rawPullRequests = changes.pullRequests.map(toLegacyPullRequest)
  const pullRequestsByKey = new Map(
    rawPullRequests.map((pullRequest) => [
      legacyPullRequestKey({
        number: pullRequest.number,
        baseRepository: pullRequest.baseRepository?.nameWithOwner,
      }),
      pullRequest,
    ]),
  )

  return {
    commits: changes.commits.map((commit) =>
      toLegacyCommit(commit, pullRequestsByKey),
    ),
    newContributorLogins: changes.newContributorLogins,
    pullRequests: rawPullRequests,
  }
}
