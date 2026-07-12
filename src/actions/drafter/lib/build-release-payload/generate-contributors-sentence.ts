import { context } from '@actions/github'
import { filterPullRequestsByPreCategories } from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'
import { renderTemplate } from './render-template/index.ts'

type PullRequest = Awaited<
  ReturnType<typeof findPullRequests>
>['pullRequests'][number]

type Contributor = { login: string; botUrl?: string } | { name: string }

const botSuffix = '[bot]'
const pullRequestKey = (pullRequest: PullRequest) =>
  `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`
const normalizeLogin = (login: string, isBot = false) =>
  isBot && !login.endsWith(botSuffix) ? `${login}${botSuffix}` : login
const renderAuthorMention = (contributor: Contributor) => {
  if ('name' in contributor) return contributor.name
  const botUrl = contributor.login.endsWith(botSuffix)
    ? (contributor.botUrl ??
      `${context.serverUrl.replace(/\/$/, '')}/apps/${contributor.login.slice(0, -botSuffix.length)}`)
    : undefined
  if (botUrl) {
    return `[@${contributor.login}](${botUrl})`
  }
  return `@${contributor.login}`
}

export const generateContributorsSentence = (params: {
  commits: Awaited<ReturnType<typeof findPullRequests>>['commits']
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  config: Pick<
    ParsedConfig,
    'categories' | 'exclude-contributors' | 'no-contributors-template'
  >
}) => {
  const { commits, pullRequests, config } = params

  const includedPullRequests = filterPullRequestsByPreCategories(
    pullRequests,
    config.categories,
  )
  return generateAuthorsSentence({
    commits,
    pullRequests: includedPullRequests,
    excludeContributors: config['exclude-contributors'],
    noAuthorsTemplate: config['no-contributors-template'],
  })
}

export const generateAuthorsSentence = (params: {
  commits: Awaited<ReturnType<typeof findPullRequests>>['commits']
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
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
      'mergeCommit' in pullRequest && pullRequest.mergeCommit?.oid
        ? [pullRequest.mergeCommit.oid]
        : [],
    ),
  )
  const contributors = new Map<string, Contributor>()
  const pullRequestAuthorLogins = new Set<string>()

  // Add from commits belonging to included pull requests
  for (const commit of commits) {
    if (
      !includedMergeCommitOids.has(commit.oid) &&
      !commit.associatedPullRequests?.nodes?.some(
        (pullRequest) =>
          pullRequest &&
          includedPullRequestKeys.has(pullRequestKey(pullRequest)),
      )
    ) {
      continue
    }

    for (const author of commit.authors?.nodes ??
      (commit.author ? [commit.author] : [])) {
      if (author?.user) {
        const login = normalizeLogin(author.user.login)
        contributors.set(`login:${login}`, { login })
      } else if (author?.name) {
        contributors.set(`name:${author.name}`, { name: author.name })
      }
    }
  }

  // Add from pull requests
  for (const pullRequest of pullRequests) {
    if (pullRequest.author) {
      const isBot = pullRequest.author.__typename === 'Bot'
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
          $AUTHOR_MENTION: renderAuthorMention(contributor),
        },
      })
    })
    const separator = params.authorsSeparator ?? ', '
    if (params.authorsFinalSeparator !== undefined && authors.length > 1) {
      return `${authors.slice(0, -1).join(separator)}${params.authorsFinalSeparator}${authors.at(-1)}`
    }
    return authors.join(separator)
  }

  const mentions = sortedContributors.map(renderAuthorMention)
  if (mentions.length > 1) {
    return `${mentions.slice(0, -1).join(', ')} and ${mentions.slice(-1)}`
  }
  return mentions[0]
}

export const generateNewContributorsSection = (params: {
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  newContributorLogins: ReadonlySet<string>
  config: Pick<ParsedConfig, 'categories' | 'exclude-contributors'>
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
  if (entries.length === 0) return ''

  return `## New Contributors\n\n${entries
    .map(
      ([login, pullRequest]) =>
        `* @${login} made their first contribution in #${pullRequest.number}`,
    )
    .join('\n')}`
}
