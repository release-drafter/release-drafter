import {
  evaluateCategories,
  type PullRequestLike,
} from './category-matching.ts'
import type { ParsedConfig } from './types.ts'

type Categories = ParsedConfig['categories']

/** Remove path predicates and conditions that contain only path predicates. */
export const projectPullRequestValidationCategories = (
  categories: Categories,
): Categories =>
  categories.flatMap((category) => {
    if (category.when.length === 0) return [category]

    const when = category.when.flatMap((condition) => {
      if (condition.conventional === undefined && condition.labels.length === 0)
        return []
      return [{ ...condition, paths: [] }]
    })
    return when.length > 0 ? [{ ...category, when }] : []
  })

export type PullRequestEvaluation =
  | { valid: true; skipped: true }
  | {
      valid: boolean
      skipped: false
      selectedCategoryCount: number
    }

/** Evaluate whether a pull request's title or labels select a non-fallback category. */
export const evaluatePullRequest = (
  pullRequest: PullRequestLike,
  categories: Categories,
): PullRequestEvaluation => {
  const evaluation = evaluateCategories(
    pullRequest,
    projectPullRequestValidationCategories(categories),
  )
  if (!evaluation.included) return { valid: true, skipped: true }
  const selectedCount =
    evaluation.changelogCategories.length +
    evaluation.versionResolverCategories.length

  return {
    valid: selectedCount > 0 && !evaluation.fallbackOnly,
    skipped: false,
    selectedCategoryCount: selectedCount,
  }
}
