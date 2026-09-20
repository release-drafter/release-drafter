import {
  type ChangelogCategory,
  evaluateCategories,
  getChangelogCategories,
} from '../category-matching.ts'
import { changeForCategory } from '../change.ts'
import type { Change, ParsedConfig } from '../types.ts'

export const categorizeChanges = (params: {
  changes: Change[]
  config: Pick<ParsedConfig, 'categories'>
}): [Change[], (ChangelogCategory & { changes: Change[] })[]] => {
  const { changes, config } = params
  const changelogCategories = getChangelogCategories(config.categories)
  const categorizedChanges = changelogCategories.map((category) => ({
    ...category,
    changes: [] as Change[],
  }))
  const uncategorizedChanges: Change[] = []

  for (const change of changes) {
    const evaluation = evaluateCategories(
      changeForCategory(change),
      config.categories,
    )
    if (!evaluation.included) continue
    if (evaluation.changelogCategories.length === 0) {
      uncategorizedChanges.push(change)
      continue
    }
    for (const matchedCategory of evaluation.changelogCategories) {
      const index = changelogCategories.indexOf(matchedCategory)
      if (index !== -1) categorizedChanges[index].changes.push(change)
    }
  }

  return [uncategorizedChanges, categorizedChanges]
}
