import { describe, expect, it } from 'vitest'
import type * as z from 'zod'
import {
  filterPullRequestsByPreCategories,
  getSafePreExcludePathPatterns,
  matchesCategoryCondition,
} from '#src/actions/drafter/common/category-matching.ts'
import { mergeInputAndConfig } from '#src/actions/drafter/config/index.ts'
import { commonConfigSchema } from '#src/actions/drafter/config/schemas/common-config.schema.ts'
import { configSchema } from '#src/actions/drafter/config/schemas/config.schema.ts'
import { categorizePullRequests } from '#src/actions/drafter/lib/build-release-payload/categorize-pull-requests.ts'
import { resolveVersionKeyIncrement } from '#src/actions/drafter/lib/build-release-payload/resolve-version-increment.ts'

const makeParsedConfig = (
  categories: NonNullable<z.input<typeof configSchema>['categories']>,
) =>
  mergeInputAndConfig({
    config: configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      categories,
    }),
    input: commonConfigSchema.parse({}),
  })

type PullRequest = Parameters<
  typeof categorizePullRequests
>[0]['pullRequests'][number]

const makePullRequest = (labels: string[], matchedPaths: string[] = []) =>
  ({
    labels: {
      nodes: labels.map((name) => ({ name })),
    },
    matchedPaths,
  }) as PullRequest

describe('category model', () => {
  it('supports label and path matching modes in a single condition', () => {
    expect(
      matchesCategoryCondition(
        {
          labels: ['bug', 'urgent'],
          'labels-mode': 'all',
          paths: ['src/**', 'docs/**'],
          'paths-mode': 'exactly',
        },
        makePullRequest(['bug', 'urgent', 'triaged'], ['docs/**', 'src/**']),
      ),
    ).toBe(true)

    expect(
      matchesCategoryCondition(
        {
          labels: ['bug', 'urgent'],
          'labels-mode': 'all',
          paths: ['src/**', 'docs/**'],
          'paths-mode': 'exactly',
        },
        makePullRequest(['bug'], ['src/**']),
      ),
    ).toBe(false)
  })

  it('treats when.label as shorthand for a single labels value', () => {
    const labelConfig = makeParsedConfig([
      {
        title: 'Bug fixes',
        when: { label: 'bug' },
      },
    ])
    const labelsConfig = makeParsedConfig([
      {
        title: 'Bug fixes',
        when: { labels: ['bug'] },
      },
    ])
    const pullRequests = [makePullRequest(['bug'])]

    const [, labelCategories] = categorizePullRequests({
      pullRequests,
      config: labelConfig,
    })
    const [, labelsCategories] = categorizePullRequests({
      pullRequests,
      config: labelsConfig,
    })

    expect(labelConfig.categories[0]?.when).toEqual(
      labelsConfig.categories[0]?.when,
    )
    expect(labelCategories[0]?.pullRequests).toEqual(
      labelsCategories[0]?.pullRequests,
    )
  })

  it('treats when.path as shorthand for a single paths value', () => {
    const pathConfig = makeParsedConfig([
      {
        title: 'Source changes',
        when: { path: 'src/**' },
      },
    ])
    const pathsConfig = makeParsedConfig([
      {
        title: 'Source changes',
        when: { paths: ['src/**'] },
      },
    ])
    const pullRequests = [makePullRequest([], ['src/**'])]

    const [, pathCategories] = categorizePullRequests({
      pullRequests,
      config: pathConfig,
    })
    const [, pathsCategories] = categorizePullRequests({
      pullRequests,
      config: pathsConfig,
    })

    expect(pathConfig.categories[0]?.when).toEqual(
      pathsConfig.categories[0]?.when,
    )
    expect(pathCategories[0]?.pullRequests).toEqual(
      pathsCategories[0]?.pullRequests,
    )
  })

  it('uses labels-mode any by default for when.labels', () => {
    const config = makeParsedConfig([
      {
        title: 'User-facing changes',
        when: { labels: ['feature', 'enhancement'] },
      },
    ])
    const condition = config.categories[0]?.when[0]

    expect(condition).toBeDefined()
    if (!condition) {
      throw new Error('Expected a normalized category condition')
    }

    expect(
      matchesCategoryCondition(condition, makePullRequest(['feature'])),
    ).toBe(true)
    expect(
      matchesCategoryCondition(condition, makePullRequest(['chore'])),
    ).toBe(false)
  })

  it('combines when.label and when.labels before applying labels-mode', () => {
    const config = makeParsedConfig([
      {
        title: 'Urgent bug fixes',
        when: {
          label: 'bug',
          labels: ['urgent'],
          'labels-mode': 'all',
        },
      },
    ])
    const condition = config.categories[0]?.when[0]

    expect(condition).toBeDefined()
    if (!condition) {
      throw new Error('Expected a normalized category condition')
    }

    expect(matchesCategoryCondition(condition, makePullRequest(['bug']))).toBe(
      false,
    )
    expect(
      matchesCategoryCondition(condition, makePullRequest(['bug', 'urgent'])),
    ).toBe(true)
  })

  it('combines when.path and when.paths before applying paths-mode', () => {
    const config = makeParsedConfig([
      {
        title: 'Source and docs changes',
        when: {
          path: 'src/**',
          paths: ['docs/**'],
          'paths-mode': 'all',
        },
      },
    ])
    const condition = config.categories[0]?.when[0]

    expect(condition).toBeDefined()
    if (!condition) {
      throw new Error('Expected a normalized category condition')
    }

    expect(
      matchesCategoryCondition(condition, makePullRequest([], ['src/**'])),
    ).toBe(false)
    expect(
      matchesCategoryCondition(
        condition,
        makePullRequest([], ['src/**', 'docs/**']),
      ),
    ).toBe(true)
  })

  it('ignores labels-mode when a when branch does not configure labels', () => {
    const config = makeParsedConfig([
      {
        title: 'Source changes',
        when: {
          paths: ['src/**'],
          'labels-mode': 'exactly',
        },
      },
    ])
    const condition = config.categories[0]?.when[0]

    expect(condition).toBeDefined()
    if (!condition) {
      throw new Error('Expected a normalized category condition')
    }

    expect(
      matchesCategoryCondition(condition, makePullRequest([], ['src/**'])),
    ).toBe(true)
    expect(
      matchesCategoryCondition(
        condition,
        makePullRequest(['feature', 'bug'], ['src/**']),
      ),
    ).toBe(true)
  })

  it.each([
    {
      mode: 'any' as const,
      matchingLabels: ['feature'],
      nonMatchingLabels: ['chore'],
    },
    {
      mode: 'all' as const,
      matchingLabels: ['feature', 'enhancement', 'bug'],
      nonMatchingLabels: ['feature'],
    },
    {
      mode: 'only' as const,
      matchingLabels: ['feature'],
      nonMatchingLabels: ['feature', 'chore'],
    },
    {
      mode: 'exactly' as const,
      matchingLabels: ['feature', 'enhancement'],
      nonMatchingLabels: ['feature'],
    },
  ])('applies labels-mode $mode within when conditions', ({
    mode,
    matchingLabels,
    nonMatchingLabels,
  }) => {
    const config = makeParsedConfig([
      {
        title: 'Features',
        when: {
          labels: ['feature', 'enhancement'],
          'labels-mode': mode,
        },
      },
    ])
    const condition = config.categories[0]?.when[0]

    expect(condition).toBeDefined()
    if (!condition) {
      throw new Error('Expected a normalized category condition')
    }

    expect(
      matchesCategoryCondition(condition, makePullRequest(matchingLabels)),
    ).toBe(true)
    expect(
      matchesCategoryCondition(condition, makePullRequest(nonMatchingLabels)),
    ).toBe(false)
  })

  it.each([
    {
      mode: 'any' as const,
      matchingPaths: ['src/**'],
      nonMatchingPaths: ['tests/**'],
    },
    {
      mode: 'all' as const,
      matchingPaths: ['src/**', 'docs/**', 'tests/**'],
      nonMatchingPaths: ['src/**'],
    },
    {
      mode: 'only' as const,
      matchingPaths: ['src/**'],
      nonMatchingPaths: ['src/**', 'tests/**'],
    },
    {
      mode: 'exactly' as const,
      matchingPaths: ['src/**', 'docs/**'],
      nonMatchingPaths: ['src/**'],
    },
  ])('applies paths-mode $mode within when conditions', ({
    mode,
    matchingPaths,
    nonMatchingPaths,
  }) => {
    const config = makeParsedConfig([
      {
        title: 'Source and docs changes',
        when: {
          paths: ['src/**', 'docs/**'],
          'paths-mode': mode,
        },
      },
    ])
    const condition = config.categories[0]?.when[0]

    expect(condition).toBeDefined()
    if (!condition) {
      throw new Error('Expected a normalized category condition')
    }

    expect(
      matchesCategoryCondition(condition, makePullRequest([], matchingPaths)),
    ).toBe(true)
    expect(
      matchesCategoryCondition(
        condition,
        makePullRequest([], nonMatchingPaths),
      ),
    ).toBe(false)
  })

  it('does not treat empty labels or paths as a match for mode only', () => {
    const labelsOnlyConfig = makeParsedConfig([
      {
        title: 'Features',
        when: {
          labels: ['feature', 'enhancement'],
          'labels-mode': 'only',
        },
      },
    ])
    const pathsOnlyConfig = makeParsedConfig([
      {
        title: 'Source and docs changes',
        when: {
          paths: ['src/**', 'docs/**'],
          'paths-mode': 'only',
        },
      },
    ])

    const labelsOnlyCondition = labelsOnlyConfig.categories[0]?.when[0]
    const pathsOnlyCondition = pathsOnlyConfig.categories[0]?.when[0]

    expect(labelsOnlyCondition).toBeDefined()
    expect(pathsOnlyCondition).toBeDefined()

    if (!labelsOnlyCondition || !pathsOnlyCondition) {
      throw new Error('Expected normalized category conditions')
    }

    expect(
      matchesCategoryCondition(labelsOnlyCondition, makePullRequest([])),
    ).toBe(false)
    expect(
      matchesCategoryCondition(pathsOnlyCondition, makePullRequest([], [])),
    ).toBe(false)
  })

  it('only prefilters pre-exclude paths for paths-mode any', () => {
    const config = makeParsedConfig([
      {
        type: 'pre-exclude',
        when: {
          paths: ['src/**'],
          'paths-mode': 'any',
        },
      },
      {
        type: 'pre-exclude',
        when: {
          paths: ['docs/**', 'guides/**'],
          'paths-mode': 'all',
        },
      },
      {
        type: 'pre-exclude',
        when: {
          paths: ['tests/**'],
          'paths-mode': 'only',
        },
      },
      {
        type: 'pre-exclude',
        when: {
          paths: ['infra/**'],
          'paths-mode': 'exactly',
        },
      },
      {
        type: 'pre-exclude',
        when: {
          labels: ['skip-release'],
          paths: ['release/**'],
          'paths-mode': 'any',
        },
      },
    ])

    expect(getSafePreExcludePathPatterns(config.categories)).toEqual(['src/**'])
  })

  it('applies pre-include and pre-exclude categories before changelog categorization', () => {
    const config = makeParsedConfig([
      {
        type: 'pre-include',
        when: { labels: ['app'] },
      },
      {
        type: 'pre-exclude',
        when: { paths: ['docs/**'] },
      },
      {
        title: 'App changes',
        when: { labels: ['app'] },
      },
    ])

    const pullRequests = [
      makePullRequest(['app'], ['src/**']),
      makePullRequest(['app'], ['docs/**']),
      makePullRequest(['infra'], ['src/**']),
    ]

    expect(
      filterPullRequestsByPreCategories(pullRequests, config.categories),
    ).toEqual([pullRequests[0]])
  })

  it('duplicates changelog categories by default and respects exclusive categories', () => {
    const duplicateConfig = makeParsedConfig([
      {
        title: 'Bugs',
        when: { labels: ['bug'] },
      },
      {
        title: 'Urgent',
        when: { labels: ['bug'] },
      },
    ])
    const exclusiveConfig = makeParsedConfig([
      {
        title: 'Bugs',
        when: { labels: ['bug'] },
        exclusive: true,
      },
      {
        title: 'Urgent',
        when: { labels: ['bug'] },
      },
    ])
    const pullRequests = [makePullRequest(['bug'])]

    const [, duplicateCategories] = categorizePullRequests({
      pullRequests,
      config: duplicateConfig,
    })
    const [, exclusiveCategories] = categorizePullRequests({
      pullRequests,
      config: exclusiveConfig,
    })

    expect(
      duplicateCategories.map((category) => category.pullRequests),
    ).toEqual([[pullRequests[0]], [pullRequests[0]]])
    expect(
      exclusiveCategories.map((category) => category.pullRequests),
    ).toEqual([[pullRequests[0]], []])
  })

  it('lets exclusive version-resolver categories stop lower-priority matches', () => {
    const config = makeParsedConfig([
      {
        type: 'version-resolver',
        'semver-increment': 'minor',
        when: { labels: ['feature'] },
        exclusive: true,
      },
      {
        type: 'version-resolver',
        'semver-increment': 'major',
        when: { labels: ['breaking'] },
      },
      {
        type: 'version-resolver',
        'semver-increment': 'patch',
      },
    ])

    expect(
      resolveVersionKeyIncrement({
        pullRequests: [makePullRequest(['feature', 'breaking'])],
        config,
      }),
    ).toBe('minor')
  })

  it('uses changelog category semver increments when resolving version increment', () => {
    const config = makeParsedConfig([
      {
        title: 'Features',
        'semver-increment': 'minor',
        when: { labels: ['feature'] },
      },
    ])

    expect(
      resolveVersionKeyIncrement({
        pullRequests: [makePullRequest(['feature'])],
        config,
      }),
    ).toBe('minor')
  })

  it('respects exclusive changelog categories when resolving version increment', () => {
    const config = makeParsedConfig([
      {
        title: 'Features',
        'semver-increment': 'minor',
        when: { labels: ['feature'] },
        exclusive: true,
      },
      {
        title: 'Breaking features',
        'semver-increment': 'major',
        when: { labels: ['feature'] },
      },
    ])

    expect(
      resolveVersionKeyIncrement({
        pullRequests: [makePullRequest(['feature'])],
        config,
      }),
    ).toBe('minor')
  })

  it('only applies uncategorized changelog semver increments to unmatched changes', () => {
    const config = makeParsedConfig([
      {
        title: 'Features',
        'semver-increment': 'minor',
        when: { labels: ['feature'] },
      },
      {
        title: 'Other changes',
        'semver-increment': 'major',
      },
    ])

    expect(
      resolveVersionKeyIncrement({
        pullRequests: [makePullRequest(['feature'])],
        config,
      }),
    ).toBe('minor')

    expect(
      resolveVersionKeyIncrement({
        pullRequests: [makePullRequest(['docs'])],
        config,
      }),
    ).toBe('major')
  })

  it('scopes exclusive matching independently for changelog and version-resolver categories', () => {
    const config = makeParsedConfig([
      {
        title: 'Bugs',
        when: { labels: ['bug'] },
        exclusive: true,
      },
      {
        title: 'Urgent',
        when: { labels: ['bug'] },
      },
      {
        type: 'version-resolver',
        'semver-increment': 'minor',
        when: { labels: ['bug'] },
        exclusive: true,
      },
      {
        type: 'version-resolver',
        'semver-increment': 'major',
        when: { labels: ['breaking'] },
      },
    ])
    const pullRequests = [makePullRequest(['bug', 'breaking'])]

    const [, categories] = categorizePullRequests({
      pullRequests,
      config,
    })
    const versionIncrement = resolveVersionKeyIncrement({
      pullRequests,
      config,
    })

    expect(categories.map((category) => category.pullRequests)).toEqual([
      [pullRequests[0]],
      [],
    ])
    expect(versionIncrement).toBe('minor')
  })
})
