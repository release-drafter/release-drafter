import ignore from 'ignore'
import type { ParsedConfig } from '../config/index.ts'

type ParsedCategory = ParsedConfig['categories'][number]
type ParsedCondition = ParsedCategory['when'][number]
type LabelsMode = ParsedCondition['labels-mode']
type PathsMode = ParsedCondition['paths-mode']

type PullRequestLike = {
  labels?: {
    nodes?: ({ name?: string | null } | null)[] | null
  } | null
  changedFiles?: string[]
}

export type ChangelogCategory = Extract<ParsedCategory, { type: 'changelog' }>
export type VersionResolverCategory = Extract<
  ParsedCategory,
  { type: 'version-resolver' }
>

const getPullRequestLabels = (pullRequest: PullRequestLike) =>
  (pullRequest.labels?.nodes ?? [])
    .filter((label): label is NonNullable<typeof label> & { name: string } =>
      Boolean(label?.name),
    )
    .map((label) => label.name)

const unique = (values: string[]) => [...new Set(values)]

const matchesValues = (
  actualValues: string[],
  expectedValues: string[],
  mode: LabelsMode | PathsMode,
) => {
  const actual = unique(actualValues)
  const expected = unique(expectedValues)

  if (expected.length === 0) {
    return true
  }

  switch (mode) {
    case 'all':
      return expected.every((value) => actual.includes(value))
    case 'only':
      // An empty matched set vacuously passes `every`, but `only` should still
      // require at least one configured match before the condition counts.
      return (
        actual.length > 0 && actual.every((value) => expected.includes(value))
      )
    case 'exactly':
      return (
        actual.length === expected.length &&
        actual.every((value) => expected.includes(value))
      )
    default:
      return (
        expected.length === 0 ||
        expected.some((value) => actual.includes(value))
      )
  }
}

const matchesPullRequestPaths = (
  condition: ParsedCondition,
  pullRequest: PullRequestLike,
) => {
  if (condition.paths.length === 0) {
    return true
  }

  const changedFiles = unique(pullRequest.changedFiles ?? [])
  if (changedFiles.length === 0) {
    return false
  }

  const expectedMatchers = unique(condition.paths).map((path) => ({
    path,
    matcher: ignore().add(path),
  }))
  const matchesAllConfiguredPaths = expectedMatchers.every(({ matcher }) =>
    changedFiles.some((file) => matcher.ignores(file)),
  )
  const matchesOnlyConfiguredPaths =
    changedFiles.length > 0 &&
    changedFiles.every((file) =>
      expectedMatchers.some(({ matcher }) => matcher.ignores(file)),
    )

  switch (condition['paths-mode']) {
    case 'all':
      return matchesAllConfiguredPaths
    case 'only':
      return matchesOnlyConfiguredPaths
    case 'exactly':
      return matchesAllConfiguredPaths && matchesOnlyConfiguredPaths
    default:
      return changedFiles.some((file) =>
        expectedMatchers.some(({ matcher }) => matcher.ignores(file)),
      )
  }
}

export const matchesCategoryCondition = (
  condition: ParsedCondition,
  pullRequest: PullRequestLike,
) =>
  matchesValues(
    getPullRequestLabels(pullRequest),
    condition.labels,
    condition['labels-mode'],
  ) && matchesPullRequestPaths(condition, pullRequest)

export const matchesCategory = (
  category: ParsedCategory,
  pullRequest: PullRequestLike,
) =>
  category.when.length === 0 ||
  category.when.some((condition) =>
    matchesCategoryCondition(condition, pullRequest),
  )

export const filterPullRequestsByPreCategories = <Pr extends PullRequestLike>(
  pullRequests: Pr[],
  categories: ParsedConfig['categories'],
) => {
  const preIncludeCategories = categories.filter(
    (category) => category.type === 'pre-include',
  )
  const preExcludeCategories = categories.filter(
    (category) => category.type === 'pre-exclude',
  )

  return pullRequests.filter((pullRequest) => {
    const isIncluded =
      preIncludeCategories.length === 0 ||
      preIncludeCategories.some((category) =>
        matchesCategory(category, pullRequest),
      )

    if (!isIncluded) {
      return false
    }

    return !preExcludeCategories.some((category) =>
      matchesCategory(category, pullRequest),
    )
  })
}

/**
 * Determines if any of the categories require loading pull request changed files.
 */
export const needsPullRequestChangedFiles = (
  categories: ParsedConfig['categories'],
) =>
  categories.some((category) =>
    category.when.some((condition) => condition.paths.length > 0),
  )

export const getChangelogCategories = (
  categories: ParsedConfig['categories'],
): ChangelogCategory[] =>
  categories.filter(
    (category): category is ChangelogCategory => category.type === 'changelog',
  )

export const getVersionResolverCategories = (
  categories: ParsedConfig['categories'],
): VersionResolverCategory[] =>
  categories.filter(
    (category): category is VersionResolverCategory =>
      category.type === 'version-resolver',
  )
