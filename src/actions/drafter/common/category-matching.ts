import type { ParsedConfig } from '../config'

type ParsedCategory = ParsedConfig['categories'][number]
type ParsedCondition = ParsedCategory['when'][number]
type LabelsMode = ParsedCondition['labels-mode']
type PathsMode = ParsedCondition['paths-mode']

type PullRequestLike = {
  labels?: {
    nodes?: ({ name?: string | null } | null)[] | null
  } | null
  matchedPaths?: string[]
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
      return actual.every((value) => expected.includes(value))
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

export const matchesCategoryCondition = (
  condition: ParsedCondition,
  pullRequest: PullRequestLike,
) =>
  matchesValues(
    getPullRequestLabels(pullRequest),
    condition.labels,
    condition['labels-mode'],
  ) &&
  matchesValues(
    pullRequest.matchedPaths ?? [],
    condition.paths,
    condition['paths-mode'],
  )

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

export const getConfiguredPathPatterns = (
  categories: ParsedConfig['categories'],
) =>
  unique(
    categories.flatMap((category) =>
      category.when.flatMap((condition) => condition.paths),
    ),
  )

export const getPreIncludePathPatterns = (
  categories: ParsedConfig['categories'],
) =>
  unique(
    categories
      .filter((category) => category.type === 'pre-include')
      .flatMap((category) =>
        category.when.flatMap((condition) => condition.paths),
      ),
  )

export const canUsePreIncludePathPrefilter = (
  categories: ParsedConfig['categories'],
) => {
  const preIncludeCategories = categories.filter(
    (category) => category.type === 'pre-include',
  )

  return (
    preIncludeCategories.length > 0 &&
    preIncludeCategories.every(
      (category) =>
        category.when.length > 0 &&
        category.when.every((condition) => condition.paths.length > 0),
    )
  )
}

export const getSafePreExcludePathPatterns = (
  categories: ParsedConfig['categories'],
) =>
  unique(
    categories
      .filter((category) => category.type === 'pre-exclude')
      .flatMap((category) => category.when)
      .filter(
        (condition) =>
          condition.paths.length > 0 &&
          condition.labels.length === 0 &&
          (condition['labels-mode'] === 'any' ||
            condition['labels-mode'] === 'all'),
      )
      .flatMap((condition) => condition.paths),
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
