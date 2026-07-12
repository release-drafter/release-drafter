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

      const aIsBot = 'login' in a && a.botUrl !== undefined
      const bIsBot = 'login' in b && b.botUrl !== undefined
      if (aIsBot !== bIsBot) return aIsBot ? 1 : -1

      const aName = 'name' in a ? a.name : a.login
      const bName = 'name' in b ? b.name : b.login
      return aName.localeCompare(bName)
    })
  if (sortedContributors.length === 0) {
    return params.noAuthorsTemplate ?? ''
  }

  if (params.authorTemplate !== undefined) {
    const authors = sortedContributors.map((contributor) => {
      const author =
        'name' in contributor ? contributor.name : contributor.login
      const mention =
        'name' in contributor
          ? contributor.name
          : contributor.botUrl
            ? `[@${contributor.login}](${contributor.botUrl})`
            : `@${contributor.login}`
      return renderTemplate({
        template: params.authorTemplate ?? '$MENTION',
        object: { $AUTHOR: author, $MENTION: mention },
      })
    })
    const separator = params.authorsSeparator ?? ', '
    if (params.authorsFinalSeparator !== undefined && authors.length > 1) {
      return `${authors.slice(0, -1).join(separator)}${params.authorsFinalSeparator}${authors.at(-1)}`
    }
    return authors.join(separator)
  }

  const mentions = sortedContributors.map((contributor) => {
    if ('name' in contributor) return contributor.name
    if (contributor.botUrl) {
      return `[@${contributor.login}](${contributor.botUrl})`
    }
    return contributor.login.endsWith(botSuffix)
      ? contributor.login
      : `@${contributor.login}`
  })
  if (mentions.length > 1) {
    return mentions.slice(0, -1).join(', ') + ' and ' + mentions.slice(-1)
  }
  return mentions[0]
}
