import { Config } from 'src/types'
import { findPullRequests } from '../find-pull-requests'
import { categorizePullRequests } from './categorize-pull-requests'
import { pullRequestToString } from './pull-request-to-string'
import { renderTemplate } from './render-template'

export const generateChangeLog = (params: {
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  config: Pick<
    Config,
    | 'change-title-escapes'
    | 'no-changes-template'
    | 'exclude-labels'
    | 'include-labels'
    | 'categories'
    | 'change-template'
    | 'category-template'
  >
}) => {
  const { pullRequests, config } = params

  if (pullRequests.length === 0) {
    return config['no-changes-template']
  }

  const [uncategorizedPullRequests, categorizedPullRequests] =
    categorizePullRequests({ pullRequests, config })

  const changeLog = []

  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(
      pullRequestToString({ pullRequests: uncategorizedPullRequests, config }),
      '\n\n'
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
        object: { $TITLE: category.title }
      }),
      '\n\n'
    )

    // Define the pull requests into a single string.
    const pullRequestString = pullRequestToString({
      pullRequests: category.pullRequests,
      config
    })

    // Determine the collapse status.
    const shouldCollapse =
      category['collapse-after'] !== 0 &&
      category.pullRequests.length > category['collapse-after']

    // Add the pull requests to the changelog.
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${category.pullRequests.length} changes</summary>`,
        '\n\n',
        pullRequestString,
        '\n',
        '</details>'
      )
    } else {
      changeLog.push(pullRequestString)
    }

    if (index + 1 !== categorizedPullRequests.length) changeLog.push('\n\n')
  }

  return changeLog.join('').trim()
}
