import type { ParsedConfig } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'
import { categorizePullRequests } from './categorize-pull-requests.ts'
import { pullRequestToString } from './pull-request-to-string.ts'
import { renderTemplate } from './render-template/index.ts'

export const generateChangeLog = (params: {
  commits?: Awaited<ReturnType<typeof findPullRequests>>['commits']
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
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
  const { commits = [], pullRequests, config } = params

  const [uncategorizedPullRequests, categorizedPullRequests] =
    categorizePullRequests({ pullRequests, config })

  const categorizedPullRequestsCount = categorizedPullRequests.reduce(
    (sum, category) => sum + category.pullRequests.length,
    0,
  )

  const totalPullRequestsInChangelog =
    categorizedPullRequestsCount + uncategorizedPullRequests.length

  if (totalPullRequestsInChangelog === 0) {
    return config['no-changes-template']
  }

  const changeLog: string[] = []

  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(
      pullRequestToString({
        commits,
        pullRequests: uncategorizedPullRequests,
        config,
      }),
      '\n\n',
    )
  }

  for (const [index, category] of categorizedPullRequests.entries()) {
    if (category.pullRequests.length === 0) {
      continue
    }

    // Add the category title to the changelog.
    changeLog.push(
      renderTemplate({
        template: config['category-template'],
        object: { $TITLE: category.title },
      }),
      '\n\n',
    )

    // Define the pull requests into a single string.
    const pullRequestString = pullRequestToString({
      commits,
      pullRequests: category.pullRequests,
      config,
    })

    // Determine the collapse status.
    const shouldCollapse =
      category['collapse-after'] !== -1 &&
      category.pullRequests.length > category['collapse-after']

    // Add the pull requests to the changelog.
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${category.pullRequests.length} change${
          category.pullRequests.length > 1 ? 's' : ''
        }</summary>`,
        '\n\n',
        pullRequestString,
        '\n',
        '</details>',
      )
    } else {
      changeLog.push(pullRequestString)
    }

    if (index + 1 !== categorizedPullRequests.length) changeLog.push('\n\n')
  }

  return changeLog.join('').trim()
}
