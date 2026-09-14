import type { Change, Commit, ParsedConfig } from '../types.ts'
import { categorizeChanges } from './categorize-changes.ts'
import { changeToString } from './change-to-string.ts'
import { renderTemplate } from './render-template/index.ts'

export const generateChangeLog = (params: {
  commits?: Commit[]
  changes: Change[]
  serverUrl: string
  config: Pick<
    ParsedConfig,
    | 'change-title-escapes'
    | 'no-changes-template'
    | 'categories'
    | 'change-template'
    | 'pr-template'
    | 'change-author-template'
    | 'change-authors-separator'
    | 'change-authors-final-separator'
    | 'category-template'
  >
}) => {
  const { commits = [], changes, serverUrl, config } = params
  const [uncategorizedChanges, categorizedChanges] = categorizeChanges({
    changes,
    config,
  })
  const totalChangesInChangelog =
    uncategorizedChanges.length +
    categorizedChanges.reduce(
      (sum, category) => sum + category.changes.length,
      0,
    )

  if (totalChangesInChangelog === 0) return config['no-changes-template']
  const changeLog: string[] = []

  if (uncategorizedChanges.length > 0) {
    changeLog.push(
      changeToString({
        commits,
        changes: uncategorizedChanges,
        serverUrl,
        config,
      }),
      '\n\n',
    )
  }

  const nonEmptyCategories = categorizedChanges.filter(
    (category) => category.changes.length > 0,
  )
  for (const [index, category] of nonEmptyCategories.entries()) {
    const categoryTitle = renderTemplate({
      template: config['category-template'],
      object: { $TITLE: category.title },
    })
    if (categoryTitle) changeLog.push(categoryTitle, '\n\n')
    const changeString = changeToString({
      categoryTitle: category.title,
      commits,
      changes: category.changes,
      serverUrl,
      config,
    })
    const shouldCollapse =
      category['collapse-after'] !== -1 &&
      category.changes.length > category['collapse-after']
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${category.changes.length} change${category.changes.length > 1 ? 's' : ''}</summary>`,
        '\n\n',
        changeString,
        '\n',
        '</details>',
      )
    } else {
      changeLog.push(changeString)
    }
    if (index + 1 !== nonEmptyCategories.length) changeLog.push('\n\n')
  }

  return changeLog.join('').trim()
}
