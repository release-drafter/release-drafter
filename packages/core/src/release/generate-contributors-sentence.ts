import { filterChangesByPreCategories } from '../category-matching.ts'
import { changeDate, commitAuthorKey, commitAuthors } from '../change.ts'
import type {
  Change,
  Commit,
  CommitAuthor,
  ParsedConfig,
  PullRequest,
} from '../types.ts'
import { renderTemplate } from './render-template/index.ts'

type Contributor =
  | { login: string; url?: string; isBot?: boolean }
  | { name: string; url?: string }

const botSuffix = '[bot]'
const pullRequestKey = (
  pullRequest: Pick<PullRequest, 'baseRepository' | 'number'>,
) => `${pullRequest.baseRepository}#${pullRequest.number}`
const normalizeLogin = (login: string, isBot = false) =>
  isBot && !login.endsWith(botSuffix) ? `${login}${botSuffix}` : login
const renderAuthorMention = (contributor: Contributor, serverUrl: string) => {
  if ('name' in contributor) return contributor.name
  const botUrl = contributor.login.endsWith(botSuffix)
    ? (contributor.url ??
      `${serverUrl.replace(/\/$/, '')}/apps/${contributor.login.slice(0, -botSuffix.length)}`)
    : undefined
  if (botUrl) {
    return `[@${contributor.login}](${botUrl})`
  }
  return `@${contributor.login}`
}

export const generateContributorsSentence = (params: {
  commits: Commit[]
  changes: Change[]
  serverUrl: string
  config: Pick<
    ParsedConfig,
    'categories' | 'exclude-contributors' | 'no-contributors-template'
  >
}) => {
  const { commits, changes, config, serverUrl } = params
  const includedChanges = filterChangesByPreCategories(
    changes,
    config.categories,
  )
  return generateAuthorsSentence({
    commits,
    pullRequests: includedChanges.flatMap((change) =>
      change.type === 'pull-request' ? [change.pullRequest] : [],
    ),
    directCommits: includedChanges.flatMap((change) =>
      change.type === 'commit' ? [change.commit] : [],
    ),
    serverUrl,
    excludeContributors: config['exclude-contributors'],
    noAuthorsTemplate: config['no-contributors-template'],
  })
}

export const generateAuthorsSentence = (params: {
  commits: Commit[]
  pullRequests: PullRequest[]
  directCommits?: Commit[]
  serverUrl: string
  excludeContributors?: string[]
  noAuthorsTemplate?: string
  authorTemplate?: string
  authorsSeparator?: string
  authorsFinalSeparator?: string
}) => {
  const { commits, pullRequests, directCommits = [] } = params
  const includedPullRequestKeys = new Set(pullRequests.map(pullRequestKey))
  const includedMergeCommitOids = new Set(
    pullRequests.flatMap((pullRequest) =>
      pullRequest.mergeCommitOid ? [pullRequest.mergeCommitOid] : [],
    ),
  )
  const contributors = new Map<string, Contributor>()
  const pullRequestAuthorLogins = new Set<string>()

  const addAuthor = (author: CommitAuthor | null | undefined) => {
    if (author?.login) {
      const isBot = author.type === 'Bot'
      const login = normalizeLogin(author.login, isBot)
      contributors.set(`login:${login}`, {
        login,
        url: author.url,
        isBot,
      })
    } else if (author?.name) {
      contributors.set(`name:${author.name}`, {
        name: author.name,
        url: author.url,
      })
    }
  }

  // Add from commits belonging to included pull requests
  for (const commit of commits) {
    if (
      !includedMergeCommitOids.has(commit.oid) &&
      !commit.associatedPullRequests?.some(
        (pullRequest) =>
          pullRequest &&
          includedPullRequestKeys.has(pullRequestKey(pullRequest)),
      )
    ) {
      continue
    }

    for (const author of commit.authors ??
      (commit.author ? [commit.author] : [])) {
      addAuthor(author)
    }
  }

  for (const commit of directCommits) {
    for (const author of commitAuthors(commit)) {
      addAuthor(author)
    }
  }

  // Add from pull requests
  for (const pullRequest of pullRequests) {
    if (pullRequest.author) {
      const isBot = pullRequest.author.type === 'Bot'
      const login = normalizeLogin(pullRequest.author.login, isBot)
      pullRequestAuthorLogins.add(login)
      contributors.set(`login:${login}`, {
        login,
        url: pullRequest.author.url,
        isBot,
      })
    }
  }

  const sortedContributors = [...contributors.values()]
    .filter(
      (contributor) =>
        !(params.excludeContributors ?? []).some((excluded) =>
          'name' in contributor
            ? excluded === contributor.name
            : excluded === contributor.login ||
              `${excluded}${botSuffix}` === contributor.login,
        ),
    )
    .sort((a, b) => {
      const aIsPullRequestAuthor =
        'login' in a && pullRequestAuthorLogins.has(a.login)
      const bIsPullRequestAuthor =
        'login' in b && pullRequestAuthorLogins.has(b.login)
      if (aIsPullRequestAuthor !== bIsPullRequestAuthor) {
        return aIsPullRequestAuthor ? -1 : 1
      }

      const aIsBot = 'login' in a && (a.isBot || a.login.endsWith(botSuffix))
      const bIsBot = 'login' in b && (b.isBot || b.login.endsWith(botSuffix))
      if (aIsBot !== bIsBot) return aIsBot ? 1 : -1

      const aName = 'name' in a ? a.name : a.login
      const bName = 'name' in b ? b.name : b.login
      return aName.localeCompare(bName)
    })
  if (sortedContributors.length === 0) {
    return params.noAuthorsTemplate ?? ''
  }

  if (params.authorTemplate !== undefined) {
    const authorTemplate = params.authorTemplate
    const authors = sortedContributors.map((contributor) => {
      const author =
        'name' in contributor ? contributor.name : contributor.login
      return renderTemplate({
        template: authorTemplate,
        object: {
          $AUTHOR: author,
          $AUTHOR_MENTION: renderAuthorMention(contributor, params.serverUrl),
          $AUTHOR_URL: contributor.url ?? '',
        },
      })
    })
    const separator = params.authorsSeparator ?? ', '
    if (params.authorsFinalSeparator !== undefined && authors.length > 1) {
      return `${authors.slice(0, -1).join(separator)}${params.authorsFinalSeparator}${authors.at(-1)}`
    }
    return authors.join(separator)
  }

  const mentions = sortedContributors.map((contributor) =>
    renderAuthorMention(contributor, params.serverUrl),
  )
  if (mentions.length > 1) {
    return `${mentions.slice(0, -1).join(', ')} and ${mentions.slice(-1)}`
  }
  return mentions[0]
}

export const generateNewContributorsList = (params: {
  changes: Change[]
  newContributorLogins: ReadonlySet<string>
  newCommitContributorKeys?: ReadonlySet<string>
  config: Pick<
    ParsedConfig,
    | 'categories'
    | 'exclude-contributors'
    | 'new-contributor-template'
    | 'no-new-contributor-template'
  >
}) => {
  const {
    changes,
    newContributorLogins,
    newCommitContributorKeys = new Set<string>(),
    config,
  } = params
  const includedChanges = filterChangesByPreCategories(
    changes,
    config.categories,
  )
  const firstChangeByContributor = new Map<
    string,
    { change: Change; author: CommitAuthor }
  >()

  for (const change of includedChanges) {
    const author =
      change.type === 'pull-request'
        ? change.pullRequest.author
        : change.commit.author
    if (!author) continue
    const key = commitAuthorKey(author)
    if (!key) continue
    const isNew =
      change.type === 'pull-request'
        ? Boolean(author.login && newContributorLogins.has(author.login))
        : newCommitContributorKeys.has(key)
    if (!isNew) continue
    const identity =
      author.login ?? ('name' in author ? author.name : undefined)
    if (identity && config['exclude-contributors'].includes(identity)) continue

    const previous = firstChangeByContributor.get(key)
    if (
      !previous ||
      (changeDate(change) ?? '') < (changeDate(previous.change) ?? '')
    ) {
      firstChangeByContributor.set(key, { change, author })
    }
  }

  const entries = [...firstChangeByContributor.values()].sort((a, b) =>
    (changeDate(a.change) ?? '').localeCompare(changeDate(b.change) ?? ''),
  )
  if (entries.length === 0) return config['no-new-contributor-template']

  return entries
    .map(({ change, author }) => {
      const login = author.login
      const title =
        change.type === 'pull-request'
          ? change.pullRequest.title
          : (change.commit.message?.split(/\r?\n/, 1)[0] ?? change.commit.oid)
      const url =
        change.type === 'pull-request'
          ? (change.pullRequest.url ?? '')
          : (change.commit.url ?? '')
      const reference =
        change.type === 'pull-request'
          ? `#${change.pullRequest.number}`
          : change.commit.url
            ? `[\`${change.commit.oid.slice(0, 7)}\`](${change.commit.url})`
            : `\`${change.commit.oid.slice(0, 7)}\``
      return renderTemplate({
        template: config['new-contributor-template'],
        object: {
          $AUTHOR: login ?? author.name ?? 'ghost',
          $AUTHOR_MENTION: login ? `@${login}` : (author.name ?? 'ghost'),
          $AUTHOR_URL: author.url ?? '',
          $CHANGE_TYPE: change.type,
          $CHANGE_TITLE: title,
          $CHANGE_URL: url,
          $CHANGE_REFERENCE: reference,
          $CHANGE_DATE: changeDate(change) ?? '',
        },
      })
    })
    .join('\n')
}
