import type { Logger } from './ports.ts'
import type {
  Change,
  Commit,
  CommitAuthor,
  ParsedConfig,
  PullRequest,
} from './types.ts'

export const splitCommitMessage = (message = '') => {
  const [title = '', ...body] = message.replaceAll('\r\n', '\n').split('\n')
  return { title, body: body.join('\n').replace(/^\n+/, '').trimEnd() }
}

export const changeTitle = (change: Change) =>
  change.type === 'pull-request'
    ? change.pullRequest.title
    : splitCommitMessage(change.commit.message).title || change.commit.oid

export const changeDate = (change: Change) =>
  change.type === 'pull-request'
    ? change.pullRequest.mergedAt
    : change.commit.committedAt

export const changeForCategory = (change: Change) =>
  change.type === 'pull-request'
    ? change.pullRequest
    : { title: change.commit.message }

export const hasPullRequestAssociation = (commit: Commit) =>
  commit.associationStatus === 'associated' ||
  Boolean(commit.associatedPullRequests?.some(Boolean))

export const commitAuthors = (commit: Commit): CommitAuthor[] => {
  if (commit.authors) return commit.authors.filter((author) => author != null)

  const authors = commit.author ? [commit.author] : []
  const coauthorPattern = new RegExp(
    ['^Co-authored-by:', String.raw`\s*(.+?)\s*<([^>]+)>\s*$`].join(''),
    'gim',
  )
  for (const match of (commit.message ?? '').matchAll(coauthorPattern)) {
    const [, name, email] = match
    if (
      !authors.some(
        (author) =>
          (email && author.email?.toLowerCase() === email.toLowerCase()) ||
          (name && author.name === name),
      )
    ) {
      authors.push({ name, email })
    }
  }
  return authors
}

export const commitAuthorKey = (author: CommitAuthor | null | undefined) => {
  if (author?.login) return `login:${author.login.toLowerCase()}`
  if (author?.email) return `email:${author.email.toLowerCase()}`
  if (author?.name) return `name:${author.name}`
  return undefined
}

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
