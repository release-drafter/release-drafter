import {
  type GitHubContext,
  getPullRequestsChangedFiles,
} from '#src/common/index.ts'
import { needsPullRequestChangedFiles } from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import { findCommitsInComparison } from './find-commits-in-comparison.ts'
import { findCommitsInComparisonRest } from './find-commits-in-comparison-rest.ts'
import { findNewContributorLoginsRest } from './find-new-contributor-logins-rest.ts'
import {
  findRecentMergedPullRequests,
  type RecentMergedPullRequest,
} from './find-recent-merged-pull-requests.ts'

const findNewContributorLogins = async (
  pullRequests: Array<{
    author?: { __typename?: string; login: string } | null
    mergedAt?: string | null
  }>,
  github: Pick<GitHubContext, 'octokit' | 'repo'>,
) => {
  const { octokit, repo } = github
  const firstMergedAtByLogin = new Map<string, string>()

  for (const pullRequest of pullRequests) {
    if (pullRequest.author?.__typename !== 'User' || !pullRequest.mergedAt)
      continue

    const previous = firstMergedAtByLogin.get(pullRequest.author.login)
    if (!previous || pullRequest.mergedAt < previous) {
      firstMergedAtByLogin.set(pullRequest.author.login, pullRequest.mergedAt)
    }
  }

  const candidates = [...firstMergedAtByLogin]
  if (candidates.length === 0) return new Set<string>()

  const variables = Object.fromEntries(
    candidates.map(([login, mergedAt], index) => [
      `query${index}`,
      `repo:${repo.owner}/${repo.repo} is:pr is:merged author:${login} merged:<${mergedAt}`,
    ]),
  )
  const data = await octokit.graphql<Record<string, { issueCount: number }>>(
    `query findPreviousContributions(${candidates.map((_, index) => `$query${index}: String!`).join(', ')}) {
      ${candidates.map((_, index) => `author${index}: search(query: $query${index}, type: ISSUE, first: 1) { issueCount }`).join('\n')}
    }`,
    variables,
  )

  return new Set(
    candidates.flatMap(([login], index) =>
      data[`author${index}`]?.issueCount === 0 ? [login] : [],
    ),
  )
}

export const findPullRequests = async (params: {
  lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']
  config: ParsedConfig
  previousCommitish?: string
  github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo' | 'restOnly'>
}) => {
  const { logger, octokit, repo } = params.github
  const sharedComparisonParams = {
    name: repo.repo,
    owner: repo.owner,
    withPullRequestBody: params.config['change-template'].includes('$BODY'),
    withPullRequestURL: params.config['change-template'].includes('$URL'),
    withBaseRefName:
      params.config['change-template'].includes('$BASE_REF_NAME'),
    withHeadRefName:
      params.config['change-template'].includes('$HEAD_REF_NAME'),
    pullRequestLimit: params.config['pull-request-limit'],
    historyLimit: params.config['history-limit'],
  }

  const previousCommitish =
    params.previousCommitish ||
    (params.lastRelease?.tag_name
      ? `refs/tags/${params.lastRelease.tag_name}`
      : undefined)
  if (!previousCommitish) {
    logger.warning('A previous (published) release is required to find changes')
    return {
      commits: [],
      newContributorLogins: new Set<string>(),
      pullRequests: [],
    }
  }

  logger.info(
    `🔎 Discovering commits between ${previousCommitish} and ${params.config.commitish}...`,
  )
  // Gitea and Forgejo expose GitHub's REST surface but no GraphQL API, so the
  // comparison falls back to inverting the pull request index over REST.
  const restOnly = !!params.github.restOnly
  const commits = restOnly
    ? await findCommitsInComparisonRest({
        baseCommitish: previousCommitish,
        headCommitish: params.config.commitish,
        github: params.github,
        // Recovering squashed co-authors costs a request per pull request, so
        // only pay it when a template actually renders contributors.
        withCommitAuthors: [
          params.config['change-template'],
          params.config['change-author-template'],
          params.config.header,
          params.config.template,
          params.config.footer,
        ].some(
          (template) =>
            template?.includes('$AUTHORS') ||
            template?.includes('$CONTRIBUTORS'),
        ),
        ...sharedComparisonParams,
      })
    : await findCommitsInComparison({
        baseCommitish: previousCommitish,
        headCommitish: params.config.commitish,
        useCommitishes: !!params.previousCommitish,
        github: params.github,
        ...sharedComparisonParams,
      })

  logger.info(`  Found ${commits.length} commits.`)

  // Extract unique PRs from commits, deduplicated by repo + PR number
  const pullRequestsByKey = new Map(
    commits
      .flatMap((commit) => commit.associatedPullRequests?.nodes ?? [])
      .filter((pr) => pr != null)
      .map(
        (pr) =>
          [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr] as const,
      ),
  )
  const pullRequestsRaw = [...pullRequestsByKey.values()]

  // GitHub's associatedPullRequests index lags for very recently merged PRs;
  // query the PR table directly to recover any whose merge commit is in range.
  const comparisonCommitOids = new Set(
    commits.flatMap((c) => (c.oid ? [c.oid] : [])),
  )
  // Filter by branch only when commitish is a confirmed branch ref
  // (refs/heads/...). For bare values (e.g. "main", "v1.2.3") we can't tell
  // branch from tag, so fall back to no filter and rely on OID intersection.
  // Skip the safety net entirely for tag/pull refs since PRs don't merge into
  // those.
  const { commitish } = params.config
  const isBranchRef = commitish.startsWith('refs/heads/')
  const isUnsupportedRef =
    commitish.startsWith('refs/tags/') || commitish.startsWith('refs/pull/')
  // The REST path already reads the pull request table directly, so it has no
  // index lag to compensate for and needs no safety net.
  const recoveredPRs =
    comparisonCommitOids.size === 0 || isUnsupportedRef || restOnly
      ? []
      : await findRecentMergedPullRequests({
          baseRefName: isBranchRef
            ? commitish.replace(/^refs\/heads\//, '')
            : null,
          commitOids: comparisonCommitOids,
          foundPrKeys: new Set(pullRequestsByKey.keys()),
          github: params.github,
          fieldFlags: {
            withPullRequestBody: sharedComparisonParams.withPullRequestBody,
            withPullRequestURL: sharedComparisonParams.withPullRequestURL,
            withBaseRefName: sharedComparisonParams.withBaseRefName,
            withHeadRefName: sharedComparisonParams.withHeadRefName,
          },
        })
  const pullRequests: Array<
    (typeof pullRequestsRaw)[number] | RecentMergedPullRequest
  > = [...pullRequestsRaw, ...recoveredPRs].filter(
    (pr) =>
      // `baseRepository` is the repository the PR targets, not the head/fork repo.
      // Keep fork PRs that target the current repository, and exclude associated
      // PRs that belong to some other repository but share the same commit.
      pr.baseRepository?.nameWithOwner === `${repo.owner}/${repo.repo}` &&
      // Ensure PR is merged
      pr.merged,
  )
  const shouldLoadPullRequestChangedFiles = needsPullRequestChangedFiles(
    params.config.categories,
  )
  const pullRequestChangedFiles = shouldLoadPullRequestChangedFiles
    ? await getPullRequestsChangedFiles({
        owner: repo.owner,
        repo: repo.repo,
        pullRequests,
        octokit,
      })
    : new Map<string, string[]>()
  const usesNewContributors = [
    params.config.header,
    params.config.template,
    params.config.footer,
  ].some((template) => template?.includes('$NEW_CONTRIBUTORS'))
  const newContributorLogins = usesNewContributors
    ? restOnly
      ? await findNewContributorLoginsRest({
          pullRequests,
          github: params.github,
        })
      : await findNewContributorLogins(pullRequests, params.github)
    : new Set<string>()

  logger.info(
    `  Found ${pullRequests.length} merged pull requests targeting ${repo.owner}/${repo.repo}${
      pullRequests.length > 0
        ? `: ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`
        : '.'
    }`,
  )

  return {
    commits,
    newContributorLogins,
    pullRequests: pullRequests.map((pullRequest) =>
      shouldLoadPullRequestChangedFiles
        ? {
            ...pullRequest,
            changedFiles: pullRequestChangedFiles.get(
              `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`,
            ),
          }
        : pullRequest,
    ),
  }
}
