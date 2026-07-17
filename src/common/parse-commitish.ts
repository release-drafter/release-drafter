import * as core from '@actions/core'
import { context } from '@actions/github'
import type { ParsedConfig } from '#src/actions/drafter/config/index.ts'
import { executeGraphql } from './execute-graphql.ts'
import { getOctokit, type Octokit } from './get-octokit.ts'
import {
  ResolveCommitishDocument,
  ResolvePullRequestCommitishDocument,
} from './graphql/resolve-commitish.graphql.generated.ts'

const resolveTagToCommitSha = async (params: {
  octokit: Octokit
  tagRef: string
}) => {
  const { octokit, tagRef } = params
  const data = await executeGraphql(octokit.graphql, ResolveCommitishDocument, {
    name: context.repo.repo,
    owner: context.repo.owner,
    expression: `${tagRef}^{commit}`,
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
}) => {
  const { octokit, pullRequestNumber, refType } = params
  const data = await executeGraphql(
    octokit.graphql,
    ResolvePullRequestCommitishDocument,
    {
      name: context.repo.repo,
      owner: context.repo.owner,
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
  octokit?: Octokit,
) => {
  if (commitish.startsWith('refs/heads/')) {
    return commitish.replace(/^refs\/heads\//, '')
  }

  if (commitish.startsWith('refs/tags/')) {
    return resolveTagToCommitSha({
      octokit: octokit ?? getOctokit(),
      tagRef: commitish,
    }).catch(() => {
      core.warning(
        `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
      )

      return ''
    })
  }

  if (commitish.startsWith('refs/pull/')) {
    const pullRequestRef = /^refs\/pull\/(\d+)\/(head|merge)$/.exec(commitish)

    if (pullRequestRef) {
      const [, pullRequestNumber, refType] = pullRequestRef

      return resolvePullRequestToCommitSha({
        octokit: octokit ?? getOctokit(),
        pullRequestNumber: Number(pullRequestNumber),
        refType: refType as 'head' | 'merge',
      }).catch(() => {
        core.warning(
          `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
        )

        return ''
      })
    }

    core.warning(
      `${commitish} is not a supported pull request ref, falling back to default branch`,
    )
    return ''
  }

  return commitish
}
