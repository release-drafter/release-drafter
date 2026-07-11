import { filterPullRequestsByPreCategories } from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

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
  const includedPullRequestKeys = new Set(
    includedPullRequests.map(pullRequestKey),
  )
  const contributors = new Map<string, Contributor>()

  // Add from commits that have associated pull requests
  for (const commit of commits) {
    if (
      !commit.associatedPullRequests?.nodes?.some(
        (pullRequest) =>
          pullRequest &&
          includedPullRequestKeys.has(pullRequestKey(pullRequest)),
      )
    ) {
      continue
    }

    if (commit.author?.user) {
      const login = normalizeLogin(commit.author.user.login)
      contributors.set(`login:${login}`, { login })
    } else if (commit.author?.name) {
      contributors.set(`name:${commit.author.name}`, {
        name: commit.author.name,
      })
    }
  }

  // Add from pull requests
  for (const pullRequest of includedPullRequests) {
    if (pullRequest.author) {
      const isBot = pullRequest.author.__typename === 'Bot'
      const login = normalizeLogin(pullRequest.author.login, isBot)
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
        !config['exclude-contributors'].some(
          (excluded) =>
            excluded === contributor.login ||
            `${excluded}${botSuffix}` === contributor.login,
        ),
    )
    .sort((a, b) => {
      const aIsBot = 'login' in a && a.botUrl !== undefined
      const bIsBot = 'login' in b && b.botUrl !== undefined
      if (aIsBot !== bIsBot) return aIsBot ? 1 : -1

      const aName = 'name' in a ? a.name : a.login
      const bName = 'name' in b ? b.name : b.login
      return aName.localeCompare(bName)
    })
    .map((contributor) => {
      if ('name' in contributor) return contributor.name
      if (contributor.botUrl) {
        return `[@${contributor.login}](${contributor.botUrl})`
      }
      return contributor.login.endsWith(botSuffix)
        ? contributor.login
        : `@${contributor.login}`
    })
  if (sortedContributors.length > 1) {
    return (
      sortedContributors.slice(0, -1).join(', ') +
      ' and ' +
      sortedContributors.slice(-1)
    )
  } else if (sortedContributors.length === 1) {
    return sortedContributors[0]
  } else {
    return config['no-contributors-template']
  }
}
