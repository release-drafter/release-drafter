import { CommitParser } from 'conventional-commits-parser'
import ignore from 'ignore'
import type { ParsedConfig } from '../config/index.ts'

type ParsedCategory = ParsedConfig['categories'][number]
type ParsedCondition = ParsedCategory['when'][number]
type LabelsMode = ParsedCondition['labels-mode']
type PathsMode = ParsedCondition['paths-mode']

type PullRequestLike = {
  title?: string
  labels?: {
    nodes?: ({ name?: string | null } | null)[] | null
  } | null
  changedFiles?: string[]
}

// Matches conventional-changelog's conventionalcommits preset so `!` breaking
// markers are parsed into notes instead of rejected by the default parser.
// https://github.com/conventional-changelog/conventional-changelog/blob/74a977a970f0eb5cdf317538baec8290eb909a05/packages/conventional-changelog-conventionalcommits/src/parser.js#L4
const conventionalParser = new CommitParser({
  headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
  breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
})

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

const parseConventionalTitle = (title?: string) => {
  if (!title) return undefined

  const parsed = conventionalParser.parse(title)
  if (typeof parsed.type !== 'string') return undefined

  return {
    type: parsed.type,
    scope: typeof parsed.scope === 'string' ? parsed.scope : undefined,
    // By default, only breaking changes are added to notes
    // see https://conventional-changelog.js.org/commits-parser/#breaking-changes-and-notes
    breaking: parsed.notes.length > 0,
  }
}

const matchesConventionalTitle = (
  condition: ParsedCondition,
  pullRequest: PullRequestLike,
) => {
  if (!condition.conventional) {
    return true
  }

  const parsed = parseConventionalTitle(pullRequest.title)
  if (!parsed) {
    return false
  }

  const { types, scopes, breaking } = condition.conventional

  return (
    (types.length === 0 || types.includes(parsed.type)) &&
    (scopes.length === 0 ||
      (parsed.scope !== undefined && scopes.includes(parsed.scope))) &&
    (breaking === undefined || breaking === parsed.breaking)
  )
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
  matchesPullRequestPaths(condition, pullRequest) &&
  matchesConventionalTitle(condition, pullRequest)

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
