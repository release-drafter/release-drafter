import { filterPullRequestsByPreCategories } from '../category-matching.ts'
import type { Commit, ParsedConfig, PullRequest } from '../types.ts'
import { renderTemplate } from './render-template/index.ts'

type Contributor = { login: string; botUrl?: string } | { name: string }

const botSuffix = '[bot]'
const pullRequestKey = (
  pullRequest: Pick<PullRequest, 'baseRepository' | 'number'>,
) => `${pullRequest.baseRepository}#${pullRequest.number}`
const normalizeLogin = (login: string, isBot = false) =>
  isBot && !login.endsWith(botSuffix) ? `${login}${botSuffix}` : login
const renderAuthorMention = (contributor: Contributor, serverUrl: string) => {
  if ('name' in contributor) return contributor.name
  const botUrl = contributor.login.endsWith(botSuffix)
    ? (contributor.botUrl ??
      `${serverUrl.replace(/\/$/, '')}/apps/${contributor.login.slice(0, -botSuffix.length)}`)
    : undefined
  if (botUrl) {
    return `[@${contributor.login}](${botUrl})`
  }
  return `@${contributor.login}`
}

export const generateContributorsSentence = (params: {
  commits: Commit[]
  pullRequests: PullRequest[]
  serverUrl: string
  config: Pick<
    ParsedConfig,
    'categories' | 'exclude-contributors' | 'no-contributors-template'
  >
}) => {
  const { commits, pullRequests, config, serverUrl } = params

  const includedPullRequests = filterPullRequestsByPreCategories(
    pullRequests,
    config.categories,
  )
  return generateAuthorsSentence({
    commits,
    pullRequests: includedPullRequests,
    serverUrl,
    excludeContributors: config['exclude-contributors'],
    noAuthorsTemplate: config['no-contributors-template'],
  })
}

export const generateAuthorsSentence = (params: {
  commits: Commit[]
  pullRequests: PullRequest[]
  serverUrl: string
  excludeContributors?: string[]
  noAuthorsTemplate?: string
  authorTemplate?: string
  authorsSeparator?: string
  authorsFinalSeparator?: string
}) => {
  const { commits, pullRequests } = params
  const includedPullRequestKeys = new Set(pullRequests.map(pullRequestKey))
  const includedMergeCommitOids = new Set(
    pullRequests.flatMap((pullRequest) =>
      pullRequest.mergeCommitOid ? [pullRequest.mergeCommitOid] : [],
    ),
  )
  const contributors = new Map<string, Contributor>()
  const pullRequestAuthorLogins = new Set<string>()

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
      if (author?.login) {
        const login = normalizeLogin(author.login)
        contributors.set(`login:${login}`, { login })
      } else if (author?.name) {
        contributors.set(`name:${author.name}`, { name: author.name })
      }
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
        botUrl: isBot ? pullRequest.author.url : undefined,
      })
    }
  }

  const sortedContributors = [...contributors.values()]
    .filter(
      (contributor) =>
        'name' in contributor ||
        !(params.excludeContributors ?? []).some(
          (excluded) =>
            excluded === contributor.login ||
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

      const aIsBot =
        'login' in a && (a.botUrl !== undefined || a.login.endsWith(botSuffix))
      const bIsBot =
        'login' in b && (b.botUrl !== undefined || b.login.endsWith(botSuffix))
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
  pullRequests: PullRequest[]
  newContributorLogins: ReadonlySet<string>
  config: Pick<
    ParsedConfig,
    | 'categories'
    | 'exclude-contributors'
    | 'new-contributor-template'
    | 'no-new-contributor-template'
  >
}) => {
  const { pullRequests, newContributorLogins, config } = params
  const firstPullRequestByLogin = new Map<string, PullRequest>()
  const includedPullRequestKeys = new Set(
    filterPullRequestsByPreCategories(pullRequests, config.categories).map(
      pullRequestKey,
    ),
  )

  for (const pullRequest of pullRequests) {
    if (
      !pullRequest.author ||
      !newContributorLogins.has(pullRequest.author.login) ||
      config['exclude-contributors'].includes(pullRequest.author.login)
    ) {
      continue
    }

    const previous = firstPullRequestByLogin.get(pullRequest.author.login)
    if (!previous || (pullRequest.mergedAt ?? '') < (previous.mergedAt ?? '')) {
      firstPullRequestByLogin.set(pullRequest.author.login, pullRequest)
    }
  }

  const entries = [...firstPullRequestByLogin.entries()]
    .filter(([, pullRequest]) =>
      includedPullRequestKeys.has(pullRequestKey(pullRequest)),
    )
    .sort(
      ([, a], [, b]) =>
        (a.mergedAt ?? '').localeCompare(b.mergedAt ?? '') ||
        a.number - b.number,
    )
  if (entries.length === 0) return config['no-new-contributor-template']

  return entries
    .map(([login, pullRequest]) =>
      renderTemplate({
        template: config['new-contributor-template'],
        object: {
          $AUTHOR: login,
          $AUTHOR_MENTION: `@${login}`,
          $AUTHOR_URL: pullRequest.author?.url,
          $NUMBER: pullRequest.number,
          $URL: pullRequest.url,
        },
      }),
    )
    .join('\n')
}
