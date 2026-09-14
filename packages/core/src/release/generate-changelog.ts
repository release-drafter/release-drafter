import { type Logger, noopLogger } from '../ports.ts'
import type { Change, Commit, ParsedConfig } from '../types.ts'
import { categorizeChanges } from './categorize-changes.ts'
import { type ChangelogChange, changeToString } from './change-to-string.ts'
import { groupChanges } from './group-changes.ts'
import { renderTemplate } from './render-template/index.ts'

export const generateChangeLog = (params: {
  commits?: Commit[]
  logger?: Logger
  changes: Change[]
  serverUrl: string
  config: Pick<
    ParsedConfig,
    | 'change-title-escapes'
    | 'change-body-escapes'
    | 'replacers'
    | 'no-changes-template'
    | 'categories'
    | 'change-template'
    | 'pr-template'
    | 'commit-template'
    | 'change-author-template'
    | 'change-authors-exclude-bots'
    | 'change-authors-separator'
    | 'change-authors-final-separator'
    | 'category-template'
    | 'group-changes'
  >
}) => {
  const { commits = [], logger = noopLogger, changes, serverUrl, config } = params
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
  // Grouping is applied per bucket so that a pull request matching several
  // categories is grouped with the other changes of each category separately.
  const toGroupedChanges = (changes: Change[]): ChangelogChange[] => {
    const groups = groupChanges({
      pullRequests: changes.flatMap((change) =>
        change.type === 'pull-request' ? [change.pullRequest] : [],
      ),
      rules: config['group-changes'],
      logger,
    })
    const byRepresentative = new Map(groups.map((group) => [group.representative, group]))
    return changes.flatMap((change): ChangelogChange[] => {
      if (change.type === 'commit') return [change]
      const group = byRepresentative.get(change.pullRequest)
      return group ? [{ ...change, group }] : []
    })
  }

  if (uncategorizedChanges.length > 0) {
    changeLog.push(
      changeToString({
        commits,
        changes: toGroupedChanges(uncategorizedChanges),
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
    const groupedChanges = toGroupedChanges(category.changes)
    const changeString = changeToString({
      categoryTitle: category.title,
      changes: groupedChanges,
      commits,
      serverUrl,
      config,
    })
    const shouldCollapse =
      category['collapse-after'] !== -1 &&
      groupedChanges.length > category['collapse-after']
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${groupedChanges.length} change${groupedChanges.length > 1 ? 's' : ''}</summary>`,
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
