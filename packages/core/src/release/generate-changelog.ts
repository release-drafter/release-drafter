import type { Commit, ParsedConfig, PullRequest } from '../types.ts'
import { categorizePullRequests } from './categorize-pull-requests.ts'
import { pullRequestToString } from './pull-request-to-string.ts'
import { renderTemplate } from './render-template/index.ts'

export const generateChangeLog = (params: {
  commits?: Commit[]
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
  >
}) => {
  const { commits = [], pullRequests, serverUrl, config } = params
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

  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(
      pullRequestToString({
        commits,
        pullRequests: uncategorizedPullRequests,
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
    const pullRequestString = pullRequestToString({
      category: category.title,
      commits,
      pullRequests: category.pullRequests,
      serverUrl,
      config,
    })
    const shouldCollapse =
      category['collapse-after'] !== -1 &&
      category.pullRequests.length > category['collapse-after']
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${category.pullRequests.length} change${category.pullRequests.length > 1 ? 's' : ''}</summary>`,
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
