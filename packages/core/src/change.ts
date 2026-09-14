import type { Change, Commit, CommitAuthor } from './types.ts'

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

/** Uses adapter-provided authors when available, falling back to commit trailers. */
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

/** Returns the strongest available stable identity: login, then email, then name. */
export const commitAuthorKey = (author: CommitAuthor | null | undefined) => {
  if (author?.login) return `login:${author.login.toLowerCase()}`
  if (author?.email) return `email:${author.email.toLowerCase()}`
  if (author?.name) return `name:${author.name}`
  return undefined
}
