import type { Logger } from '../ports.ts'
import type { Change, Commit, ParsedConfig, PullRequest } from '../types.ts'

const hasLocalPrAssociation = (
  commit: Commit,
  mergeCommitOids: ReadonlySet<string>,
) =>
  mergeCommitOids.has(commit.oid) ||
  Boolean(commit.associatedPullRequests?.some(Boolean))

const hasExplicitForgePrAssociation = (commit: Commit) =>
  commit.associationStatus === 'associated'

const hasUnresolvedForgePrAssociation = (commit: Commit) =>
  commit.associationStatus === 'unresolved'

const associationRank = { unresolved: 0, unassociated: 1, associated: 2 }

/** Selects the deduplicated release entries, omitting commits represented by PRs. */
export const selectChanges = (params: {
  commits: Commit[]
  pullRequests: PullRequest[]
  config: Pick<ParsedConfig, 'include-commits'>
  logger?: Logger
}) => {
  // Deduplicate PRs by PR number and repo
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

  // Duplicate adapter records can carry different association evidence. Prefer
  // the strongest evidence so an early unassociated record cannot render a PR
  // commit as an individual change.
  const commits = new Map<string, Commit>()
  for (const commit of params.commits) {
    const existing = commits.get(commit.oid)
    if (
      !existing ||
      associationRank[commit.associationStatus] >
        associationRank[existing.associationStatus] ||
      (!existing.associatedPullRequests?.some(Boolean) &&
        commit.associatedPullRequests?.some(Boolean))
    ) {
      commits.set(commit.oid, commit)
    }
  }

  let unresolvedCount = 0
  for (const commit of commits.values()) {
    if (hasUnresolvedForgePrAssociation(commit)) {
      unresolvedCount += 1
      continue
    }
    if (
      hasLocalPrAssociation(commit, mergeCommitOids) ||
      hasExplicitForgePrAssociation(commit)
    ) {
      continue
    }
    changes.push({ type: 'commit', commit })
  }
  if (unresolvedCount > 0) {
    params.logger?.warning(
      unresolvedCount === 1
        ? 'Skipped 1 commit because the forge could not determine its pull request association. It was omitted to prevent a potential duplicate release entry.'
        : `Skipped ${unresolvedCount} commits because the forge could not determine their pull request associations. They were omitted to prevent potential duplicate release entries.`,
    )
  }
  return changes
}
