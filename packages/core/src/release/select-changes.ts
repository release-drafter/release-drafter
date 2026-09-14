import type { Logger } from '../ports.ts'
import type { Change, Commit, ParsedConfig, PullRequest } from '../types.ts'

const hasPullRequestAssociation = (commit: Commit) =>
  commit.associationStatus === 'associated' ||
  Boolean(commit.associatedPullRequests?.some(Boolean))

/** Selects the deduplicated release entries, omitting commits represented by PRs. */
export const selectChanges = (params: {
  commits: Commit[]
  pullRequests: PullRequest[]
  config: Pick<ParsedConfig, 'include-commits'>
  logger?: Logger
}) => {
  const pullRequests = new Map<string, PullRequest>()
  for (const pullRequest of params.pullRequests) {
    const key = `${pullRequest.baseRepository ?? ''}#${pullRequest.number}`
    if (!pullRequests.has(key)) pullRequests.set(key, pullRequest)
  }
  const changes: Change[] = [...pullRequests.values()].map((pullRequest) => ({
    type: 'pull-request',
    pullRequest,
  }))
  if (!params.config['include-commits']) return changes

  const mergeCommitOids = new Set(
    [...pullRequests.values()].flatMap((pullRequest) =>
      pullRequest.mergeCommitOid ? [pullRequest.mergeCommitOid] : [],
    ),
  )
  const seen = new Set<string>()
  let unknownCount = 0
  for (const commit of params.commits) {
    if (seen.has(commit.oid)) continue
    seen.add(commit.oid)
    if (commit.associationStatus === 'unknown') {
      unknownCount += 1
      continue
    }
    if (hasPullRequestAssociation(commit) || mergeCommitOids.has(commit.oid)) {
      continue
    }
    changes.push({ type: 'commit', commit })
  }
  if (unknownCount > 0) {
    params.logger?.warning(
      `Skipped ${unknownCount} commit${unknownCount === 1 ? '' : 's'} because pull request association could not be determined.`,
    )
  }
  return changes
}
