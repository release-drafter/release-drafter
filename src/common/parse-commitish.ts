import type { ParsedConfig } from '#src/actions/drafter/config/index.ts'
import {
  ResolveCommitishDocument,
  ResolvePullRequestCommitishDocument,
} from '#src/types/github.graphql.generated.ts'
import type { Octokit } from './get-octokit.ts'
import type { GitHubContext } from './github-context.ts'
import { executeGraphql } from './graphql.ts'

export const commitishToCommitExpression = (commitish: string) =>
  `${commitish}^{commit}`

/**
 * Gitea and Forgejo have no GraphQL API, so the tag and pull request resolvers
 * below fall back to REST. `git/commits/{ref}` peels an annotated tag to its
 * commit the same way GraphQL's `refs/tags/x^{commit}` expression does.
 */
const resolveTagToCommitShaRest = async (params: {
  octokit: Octokit
  tagRef: string
  repo: GitHubContext['repo']
}) => {
  const { octokit, tagRef, repo } = params
  const response = await octokit.request(
    'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
    {
      owner: repo.owner,
      repo: repo.repo,
      commit_sha: tagRef.replace(/^refs\/tags\//, ''),
    },
  )

  if (!response.data.sha) {
    throw new Error(`Tag ${tagRef} does not point to a commit`)
  }

  return response.data.sha
}

const resolvePullRequestToCommitShaRest = async (params: {
  octokit: Octokit
  pullRequestNumber: number
  refType: 'head' | 'merge'
  repo: GitHubContext['repo']
}) => {
  const { octokit, pullRequestNumber, refType, repo } = params
  const { data } = await octokit.rest.pulls.get({
    owner: repo.owner,
    repo: repo.repo,
    pull_number: pullRequestNumber,
  })
  const commitSha = refType === 'head' ? data.head.sha : data.merge_commit_sha

  if (!commitSha) {
    throw new Error(
      `Pull request #${pullRequestNumber} does not have a ${refType} commit`,
    )
  }

  return commitSha
}

const resolveTagToCommitSha = async (params: {
  octokit: Octokit
  tagRef: string
  repo: GitHubContext['repo']
}) => {
  const { octokit, tagRef, repo } = params
  const data = await executeGraphql(octokit.graphql, ResolveCommitishDocument, {
    name: repo.repo,
    owner: repo.owner,
    expression: commitishToCommitExpression(tagRef),
  })
  const target = data.repository?.object

  if (target?.__typename !== 'Commit') {
    throw new Error(`Tag ${tagRef} does not point to a commit`)
  }

  return target.oid
}

const resolvePullRequestToCommitSha = async (params: {
  octokit: Octokit
  pullRequestNumber: number
  refType: 'head' | 'merge'
  repo: GitHubContext['repo']
}) => {
  const { octokit, pullRequestNumber, refType, repo } = params
  const data = await executeGraphql(
    octokit.graphql,
    ResolvePullRequestCommitishDocument,
    {
      name: repo.repo,
      owner: repo.owner,
      number: pullRequestNumber,
    },
  )
  const pullRequest = data.repository?.pullRequest
  const commitSha =
    refType === 'head'
      ? pullRequest?.headRefOid
      : (pullRequest?.potentialMergeCommit?.oid ??
        pullRequest?.mergeCommit?.oid)

  if (!commitSha) {
    throw new Error(
      `Pull request #${pullRequestNumber} does not have a ${refType} commit`,
    )
  }

  return commitSha
}

/**
 * GitHub's Releases API accepts a branch name or commit SHA as
 * `target_commitish`. Normalize fully qualified branch refs, resolve fully
 * qualified tag and pull request refs to commit SHAs before building the API
 * payload.
 *
 * A tag without the `refs/tags/` prefix cannot be distinguished reliably from
 * a branch with the same name, so it is passed through unchanged.
 *
 * If ref resolution fails, preserve the existing fallback to the repository's
 * default branch.
 */
export const parseCommitishForRelease = async (
  commitish: ParsedConfig['commitish'],
  github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo' | 'restOnly'>,
) => {
  const { logger, octokit, repo, restOnly } = github
  if (commitish.startsWith('refs/heads/')) {
    return commitish.replace(/^refs\/heads\//, '')
  }

  if (commitish.startsWith('refs/tags/')) {
    const resolve = restOnly ? resolveTagToCommitShaRest : resolveTagToCommitSha

    return resolve({
      octokit,
      repo,
      tagRef: commitish,
    }).catch(() => {
      logger.warning(
        `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
      )

      return ''
    })
  }

  if (commitish.startsWith('refs/pull/')) {
    const pullRequestRef = /^refs\/pull\/(\d+)\/(head|merge)$/.exec(commitish)

    if (pullRequestRef) {
      const [, pullRequestNumber, refType] = pullRequestRef

      const resolve = restOnly
        ? resolvePullRequestToCommitShaRest
        : resolvePullRequestToCommitSha

      return resolve({
        octokit,
        repo,
        pullRequestNumber: Number(pullRequestNumber),
        refType: refType as 'head' | 'merge',
      }).catch(() => {
        logger.warning(
          `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
        )

        return ''
      })
    }

    logger.warning(
      `${commitish} is not a supported pull request ref, falling back to default branch`,
    )
    return ''
  }

  return commitish
}
