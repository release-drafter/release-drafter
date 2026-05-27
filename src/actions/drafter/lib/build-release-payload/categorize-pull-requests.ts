import {
  type ChangelogCategory,
  filterPullRequestsByPreCategories,
  getChangelogCategories,
  matchesCategory,
} from '../../common/category-matching.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]

export const categorizePullRequests = (params: {
  pullRequests: Pr[]
  config: Pick<ParsedConfig, 'categories'>
}): [Pr[], (ChangelogCategory & { pullRequests: Pr[] })[]] => {
  const { pullRequests, config } = params
  const changelogCategories = getChangelogCategories(config.categories)
  const uncategorizedPullRequests: Pr[] = []
  const categorizedPullRequests: (ChangelogCategory & {
    pullRequests: Pr[]
  })[] = changelogCategories.map((category) => {
    return { ...category, pullRequests: [] }
  })

  const uncategorizedCategoryIndex = changelogCategories.findIndex(
    (category) => category.when.length === 0,
  )
  const filteredPullRequests = filterPullRequestsByPreCategories(
    pullRequests,
    config.categories,
  )

  for (const pullRequest of filteredPullRequests) {
    let matchedAnyCategory = false

    for (const category of categorizedPullRequests) {
      if (category.when.length === 0) {
        continue
      }

      if (matchesCategory(category, pullRequest)) {
        category.pullRequests.push(pullRequest)
        matchedAnyCategory = true

        if (category.exclusive) {
          break
        }
      }
    }

    if (!matchedAnyCategory) {
      if (uncategorizedCategoryIndex === -1) {
        uncategorizedPullRequests.push(pullRequest)
      } else {
        categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
          pullRequest,
        )
      }
    }
  }

  return [uncategorizedPullRequests, categorizedPullRequests]
}
