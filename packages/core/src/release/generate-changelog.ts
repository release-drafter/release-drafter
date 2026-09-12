import { type Logger, noopLogger } from '../ports.ts'
import type { Commit, ParsedConfig, PullRequest } from '../types.ts'
import { categorizePullRequests } from './categorize-pull-requests.ts'
import { type ChangeGroup, groupChanges } from './group-changes.ts'
import { pullRequestToString } from './pull-request-to-string.ts'
import { renderTemplate } from './render-template/index.ts'

export const generateChangeLog = (params: {
  commits?: Commit[]
  logger?: Logger
  pullRequests: PullRequest[]
  serverUrl: string
  config: Pick<
    ParsedConfig,
    | 'change-title-escapes'
    | 'no-changes-template'
    | 'categories'
    | 'change-template'
    | 'change-author-template'
    | 'change-authors-separator'
    | 'change-authors-final-separator'
    | 'category-template'
    | 'group-changes'
  >
}) => {
  const {
    commits = [],
    logger = noopLogger,
    pullRequests,
    serverUrl,
    config,
  } = params
  const [uncategorizedPullRequests, categorizedPullRequests] =
    categorizePullRequests({ pullRequests, config })
  const totalPullRequestsInChangelog =
    uncategorizedPullRequests.length +
    categorizedPullRequests.reduce(
      (sum, category) => sum + category.pullRequests.length,
      0,
    )

  if (totalPullRequestsInChangelog === 0) return config['no-changes-template']
  const changeLog: string[] = []
  // Grouping is applied per bucket so that a pull request matching several
  // categories is merged with the other changes of each category separately.
  const toChanges = (categoryPullRequests: PullRequest[]): ChangeGroup[] =>
    groupChanges({
      pullRequests: categoryPullRequests,
      rules: config['group-changes'],
      logger,
    })

  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(
      pullRequestToString({
        changes: toChanges(uncategorizedPullRequests),
        commits,
        serverUrl,
        config,
      }),
      '\n\n',
    )
  }

  const nonEmptyCategories = categorizedPullRequests.filter(
    (category) => category.pullRequests.length > 0,
  )
  for (const [index, category] of nonEmptyCategories.entries()) {
    const categoryTitle = renderTemplate({
      template: config['category-template'],
      object: { $TITLE: category.title },
    })
    if (categoryTitle) changeLog.push(categoryTitle, '\n\n')
    const changes = toChanges(category.pullRequests)
    const pullRequestString = pullRequestToString({
      category: category.title,
      changes,
      commits,
      serverUrl,
      config,
    })
    const shouldCollapse =
      category['collapse-after'] !== -1 &&
      changes.length > category['collapse-after']
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${changes.length} change${changes.length > 1 ? 's' : ''}</summary>`,
        '\n\n',
        pullRequestString,
        '\n',
        '</details>',
      )
    } else {
      changeLog.push(pullRequestString)
    }
    if (index + 1 !== nonEmptyCategories.length) changeLog.push('\n\n')
  }

  return changeLog.join('').trim()
}
