import {
  evaluateCategories,
  needsPullRequestChangedFiles,
  type ParsedConfig,
  type PullRequestLike,
} from '@release-drafter/core'

type Categories = ParsedConfig['categories']

/** Keep only title-aware release categories while retaining their correlated predicates. */
export const projectConventionalCategories = (
  categories: Categories,
): Categories =>
  categories.flatMap((category) => {
    if (category.type !== 'changelog' && category.type !== 'version-resolver')
      return []
    if (category.when.length === 0) return [category]

    const when = category.when.filter(
      (condition) => condition.conventional !== undefined,
    )
    return when.length > 0 ? [{ ...category, when }] : []
  })

/** Keep every pre-category and only title-aware release categories. */
export const projectTitleCategories = (categories: Categories): Categories => [
  ...categories.filter(
    (category) =>
      category.type === 'pre-include' || category.type === 'pre-exclude',
  ),
  ...projectConventionalCategories(categories),
]

/** Detect exclusions that can be decided without querying changed files. */
export const canSkipWithoutChangedFiles = (
  pullRequest: PullRequestLike,
  categories: Categories,
): boolean => {
  const preCategories = categories.filter(
    (category) =>
      category.type === 'pre-include' || category.type === 'pre-exclude',
  )
  return (
    !needsPullRequestChangedFiles(preCategories) &&
    !evaluateCategories(pullRequest, preCategories).included
  )
}

export type TitleEvaluation =
  | { valid: true; skipped: true }
  | {
      valid: boolean
      skipped: false
      selectedCategoryCount: number
    }

/** Evaluate whether a PR's current title selects a non-fallback release category. */
export const evaluatePullRequestTitle = (
  pullRequest: PullRequestLike,
  categories: Categories,
): TitleEvaluation => {
  const evaluation = evaluateCategories(
    pullRequest,
    projectTitleCategories(categories),
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
