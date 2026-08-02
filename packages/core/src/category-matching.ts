import { CommitParser } from 'conventional-commits-parser'
import ignore from 'ignore'
import type { IncrementType } from 'verkit'
import type { ParsedConfig, PullRequest } from './types.ts'

type ReleaseType = Exclude<IncrementType, 'release'>
type ParsedCategory = ParsedConfig['categories'][number]
type ParsedCondition = ParsedCategory['when'][number]
type LabelsMode = ParsedCondition['labels-mode']
type PathsMode = ParsedCondition['paths-mode']

export type PullRequestLike = Partial<
  Pick<PullRequest, 'title' | 'labels' | 'changedFiles'>
>
export type ChangelogCategory = Extract<ParsedCategory, { type: 'changelog' }>
export type VersionResolverCategory = Extract<
  ParsedCategory,
  { type: 'version-resolver' }
>

const conventionalParser = new CommitParser({
  headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
  breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
})
const priority = { patch: 1, minor: 2, major: 3 } as const

const unique = (values: string[]) => [...new Set(values)]
const getPullRequestLabels = (pullRequest: PullRequestLike) =>
  (pullRequest.labels ?? []).filter((label) => label.length > 0)

const matchesValues = (
  actualValues: string[],
  expectedValues: string[],
  mode: LabelsMode | PathsMode,
) => {
  const actual = unique(actualValues)
  const expected = unique(expectedValues)
  if (expected.length === 0) return true

  switch (mode) {
    case 'all':
      return expected.every((value) => actual.includes(value))
    case 'only':
      return (
        actual.length > 0 && actual.every((value) => expected.includes(value))
      )
    case 'exactly':
      return (
        actual.length === expected.length &&
        actual.every((value) => expected.includes(value))
      )
    default:
      return expected.some((value) => actual.includes(value))
  }
}

const matchesPullRequestPaths = (
  condition: ParsedCondition,
  pullRequest: PullRequestLike,
) => {
  if (condition.paths.length === 0) return true
  const changedFiles = unique(pullRequest.changedFiles ?? [])
  if (changedFiles.length === 0) return false
  const matchers = unique(condition.paths).map((path) => ignore().add(path))
  const allPatternsMatch = matchers.every((matcher) =>
    changedFiles.some((file) => matcher.ignores(file)),
  )
  const onlyPatternsMatch = changedFiles.every((file) =>
    matchers.some((matcher) => matcher.ignores(file)),
  )

  switch (condition['paths-mode']) {
    case 'all':
      return allPatternsMatch
    case 'only':
      return onlyPatternsMatch
    case 'exactly':
      return allPatternsMatch && onlyPatternsMatch
    default:
      return changedFiles.some((file) =>
        matchers.some((matcher) => matcher.ignores(file)),
      )
  }
}

export const parseConventionalTitle = (title?: string) => {
  if (!title) return undefined
  const parsed = conventionalParser.parse(title)
  if (typeof parsed.type !== 'string') return undefined
  return {
    type: parsed.type,
    scope: typeof parsed.scope === 'string' ? parsed.scope : undefined,
    breaking: parsed.notes.length > 0,
  }
}

const matchesConventionalTitle = (
  condition: ParsedCondition,
  pullRequest: PullRequestLike,
) => {
  if (!condition.conventional) return true
  const parsed = parseConventionalTitle(pullRequest.title)
  if (!parsed) return false
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

const selectCategories = <
  Category extends ChangelogCategory | VersionResolverCategory,
>(
  categories: Category[],
  pullRequest: PullRequestLike,
) => {
  const matched: Category[] = []
  for (const category of categories) {
    if (category.when.length === 0) continue
    if (!matchesCategory(category, pullRequest)) continue
    matched.push(category)
    if (category.exclusive) break
  }
  const fallback = categories.find((category) => category.when.length === 0)
  return {
    categories: matched.length > 0 ? matched : fallback ? [fallback] : [],
    usedFallback: matched.length === 0 && fallback !== undefined,
  }
}

/**
 * Evaluates every category concern for one change in one deterministic pass.
 */
export const evaluateCategories = (
  pullRequest: PullRequestLike,
  categories: ParsedConfig['categories'],
) => {
  const preIncludes = categories.filter(
    (category) => category.type === 'pre-include',
  )
  const preExcludes = categories.filter(
    (category) => category.type === 'pre-exclude',
  )
  const includedByPrecondition =
    preIncludes.length === 0 ||
    preIncludes.some((category) => matchesCategory(category, pullRequest))
  const excluded =
    includedByPrecondition &&
    preExcludes.some((category) => matchesCategory(category, pullRequest))
  const included = includedByPrecondition && !excluded
  const changelog = included
    ? selectCategories(getChangelogCategories(categories), pullRequest)
    : { categories: [], usedFallback: false }
  const version = included
    ? selectCategories(getVersionResolverCategories(categories), pullRequest)
    : { categories: [], usedFallback: false }
  const increments = [...changelog.categories, ...version.categories]
    .map((category) => category['semver-increment'])
    .filter(
      (increment): increment is keyof typeof priority => increment in priority,
    )
  const highest = increments.reduce<keyof typeof priority | undefined>(
    (current, increment) =>
      !current || priority[increment] > priority[current] ? increment : current,
    undefined,
  )

  return {
    included,
    excluded,
    changelogCategories: changelog.categories,
    versionResolverCategories: version.categories,
    usedChangelogFallback: changelog.usedFallback,
    usedVersionFallback: version.usedFallback,
    fallbackOnly:
      included &&
      (changelog.categories.length > 0 || version.categories.length > 0) &&
      changelog.categories.every((category) => category.when.length === 0) &&
      version.categories.every((category) => category.when.length === 0),
    versionIncrement: highest as ReleaseType | undefined,
  }
}

export const filterPullRequestsByPreCategories = <Pr extends PullRequestLike>(
  pullRequests: Pr[],
  categories: ParsedConfig['categories'],
) =>
  pullRequests.filter(
    (pullRequest) => evaluateCategories(pullRequest, categories).included,
  )

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
