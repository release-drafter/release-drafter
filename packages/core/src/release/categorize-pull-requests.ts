import {
  type ChangelogCategory,
  evaluateCategories,
  getChangelogCategories,
} from '../category-matching.ts'
import type { ParsedConfig, PullRequest } from '../types.ts'

export const categorizePullRequests = <Pr extends PullRequest>(params: {
  pullRequests: Pr[]
  config: Pick<ParsedConfig, 'categories'>
}): [Pr[], (ChangelogCategory & { pullRequests: Pr[] })[]] => {
  const { pullRequests, config } = params
  const changelogCategories = getChangelogCategories(config.categories)
  const categorizedPullRequests = changelogCategories.map((category) => ({
    ...category,
    pullRequests: [] as Pr[],
  }))
  const uncategorizedPullRequests: Pr[] = []

  for (const pullRequest of pullRequests) {
    const evaluation = evaluateCategories(pullRequest, config.categories)
    if (!evaluation.included) continue
    if (evaluation.changelogCategories.length === 0) {
      uncategorizedPullRequests.push(pullRequest)
      continue
    }
    for (const matchedCategory of evaluation.changelogCategories) {
      const index = changelogCategories.indexOf(matchedCategory)
      if (index !== -1)
        categorizedPullRequests[index].pullRequests.push(pullRequest)
    }
  }

  return [uncategorizedPullRequests, categorizedPullRequests]
}
