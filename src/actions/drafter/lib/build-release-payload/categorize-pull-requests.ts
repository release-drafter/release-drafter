import {
  type ChangelogCategory,
  evaluateCategories,
  getChangelogCategories,
} from '@release-drafter/core'
import type { ParsedConfig } from '../../config/index.ts'
import { toCorePullRequest } from '../core-compat.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]

export const categorizePullRequests = (params: {
  pullRequests: Pr[]
  config: Pick<ParsedConfig, 'categories'>
}): [Pr[], (ChangelogCategory & { pullRequests: Pr[] })[]] => {
  const changelogCategories = getChangelogCategories(params.config.categories)
  const categorized = changelogCategories.map((category) => ({
    ...category,
    pullRequests: [] as Pr[],
  }))
  const uncategorized: Pr[] = []

  for (const pullRequest of params.pullRequests) {
    const evaluation = evaluateCategories(
      toCorePullRequest(pullRequest),
      params.config.categories,
    )
    if (!evaluation.included) continue
    if (evaluation.changelogCategories.length === 0) {
      uncategorized.push(pullRequest)
      continue
    }
    for (const category of evaluation.changelogCategories) {
      const index = changelogCategories.indexOf(category)
      if (index !== -1) categorized[index].pullRequests.push(pullRequest)
    }
  }
  return [uncategorized, categorized]
}
