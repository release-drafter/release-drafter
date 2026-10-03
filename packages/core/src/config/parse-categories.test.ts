import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Logger } from '../ports.ts'
import {
  commonConfigSchema,
  configSchema,
  configSchemaDefaults,
  mergeInputAndConfig,
  parseCategories,
} from './index.ts'

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
} satisfies Logger

const migrationDocumentationUrl =
  'https://github.com/release-drafter/release-drafter/pull/1558'

describe('parseCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    {
      type: 'pre-exclude' as const,
      deprecated: { 'exclude-labels': ['skip'] },
    },
    {
      type: 'pre-exclude' as const,
      deprecated: { 'exclude-paths': ['docs/**'] },
    },
    {
      type: 'pre-include' as const,
      deprecated: { 'include-labels': ['feature'] },
    },
    {
      type: 'pre-include' as const,
      deprecated: { 'include-paths': ['src/**'] },
    },
  ])(
    'rejects migration into an existing $type category: $deprecated',
    ({ type, deprecated }) => {
      const config = configSchema.parse({
        template: '$CHANGES',
        categories: [{ type, when: { label: 'explicit' } }],
        ...deprecated,
      })
      expect(() => parseCategories(config, config, logger)).toThrow(
        `A '${type}' category already exists`,
      )
    },
  )

  it('rejects a deprecated version default that conflicts with an explicit fallback resolver', () => {
    const config = configSchema.parse({
      template: '$CHANGES',
      'version-resolver': { default: 'major' },
      categories: [
        { type: 'changelog', when: { label: 'feature' } },
        { type: 'version-resolver', when: { label: 'breaking' } },
        { type: 'version-resolver', when: [] },
      ],
    })
    expect(() => parseCategories(config, config, logger)).toThrow(
      "A 'version-resolver' category with no 'when' condition already exists",
    )
  })

  it.each(['include', 'exclude'] as const)(
    'migrates a deprecated %s path without adding label constraints',
    (kind) => {
      const config = configSchema.parse({
        template: '$CHANGES',
        [`${kind}-paths`]: ['src/**'],
      })
      const parsed = parseCategories(config, config, logger)
      expect(parsed).toContainEqual({
        type: `pre-${kind}`,
        when: [
          {
            labels: [],
            'labels-mode': 'any',
            paths: ['src/**'],
            'paths-mode': 'any',
          },
        ],
      })
    },
  )

  it.each(['pre-include', 'pre-exclude', 'version-resolver'] as const)(
    'warns about ignored display options on %s categories',
    (type) => {
      const config = configSchema.parse({
        template: '$CHANGES',
        categories: [
          {
            type,
            title: 'Ignored',
            'semver-increment': 'major',
            when: { label: 'feature' },
          },
        ],
      })
      const parsed = parseCategories(config, config, logger)
      expect(parsed[0]).not.toHaveProperty('title')
      expect(logger.warning).toHaveBeenCalledWith(
        `Title "Ignored" ignored for category of type "${type}"`,
      )
      if (type !== 'version-resolver') {
        expect(parsed[0]).not.toHaveProperty('semver-increment')
        expect(logger.warning).toHaveBeenCalledWith(
          `"semver-increment" "major" ignored for category of type "${type}"`,
        )
      }
    },
  )

  it.each([undefined, []])(
    'preserves deprecated category labels when when is absent or empty: %j',
    (when) => {
      const config = configSchema.parse({ template: '$CHANGES' })
      const parsed = parseCategories(
        { categories: [{ labels: ['feature'], when }] },
        config,
        logger,
      )
      expect(parsed[0]?.when).toEqual([
        {
          labels: ['feature'],
          'labels-mode': 'any',
          paths: [],
          'paths-mode': 'any',
        },
      ])
      expect(logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('deprecated'),
      )
    },
  )

  it('migrates deprecated top-level include/exclude and version-resolver config into categories', () => {
    const config = configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      'exclude-labels': ['skip-release'],
      'exclude-paths': ['docs/**'],
      'include-labels': ['app'],
      'include-paths': ['src/**'],
      'version-resolver': {
        default: 'minor',
        major: { labels: ['breaking'] },
        minor: { labels: [] },
        patch: { labels: [] },
      },
    })

    const parsed = mergeInputAndConfig({
      config,
      input: commonConfigSchema.parse({}),
      logger,
    })

    expect(parsed.categories).toEqual([
      {
        type: 'pre-exclude',
        when: [
          {
            labels: ['skip-release'],
            'labels-mode': 'any',
            paths: ['docs/**'],
            'paths-mode': 'any',
          },
        ],
      },
      {
        type: 'pre-include',
        when: [
          {
            labels: ['app'],
            'labels-mode': 'any',
            paths: ['src/**'],
            'paths-mode': 'any',
          },
        ],
      },
      {
        type: 'version-resolver',
        'semver-increment': 'minor',
        when: [],
        exclusive: false,
      },
      {
        type: 'version-resolver',
        'semver-increment': 'major',
        when: [
          {
            labels: ['breaking'],
            'labels-mode': 'any',
            paths: [],
            'paths-mode': 'any',
          },
        ],
        exclusive: false,
      },
    ])
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining("deprecated 'exclude-labels' or 'exclude-paths'"),
    )
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining("deprecated 'include-labels' or 'include-paths'"),
    )
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining("deprecated 'version-resolver.default'"),
    )
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining("deprecated 'version-resolver.major.labels'"),
    )
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining(migrationDocumentationUrl),
    )
  })

  it('warns when collapse-after is set on non-changelog categories', () => {
    const config = configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      categories: [
        {
          type: 'pre-include',
          when: { paths: ['src/**'] },
          'collapse-after': 0,
        },
        {
          type: 'version-resolver',
          when: { label: 'major' },
          'semver-increment': 'major',
          'collapse-after': 1,
        },
      ],
    })

    const parsed = mergeInputAndConfig({
      config,
      input: commonConfigSchema.parse({}),
      logger,
    })

    expect(parsed.categories).toEqual([
      {
        type: 'pre-include',
        when: [
          {
            labels: [],
            'labels-mode': 'any',
            paths: ['src/**'],
            'paths-mode': 'any',
          },
        ],
      },
      {
        type: 'version-resolver',
        when: [
          {
            labels: ['major'],
            'labels-mode': 'any',
            paths: [],
            'paths-mode': 'any',
          },
        ],
        'semver-increment': 'major',
        exclusive: false,
      },
    ])

    expect(logger.warning).toHaveBeenCalledWith(
      '"collapse-after" "0" ignored for category of type "pre-include"',
    )
    expect(logger.warning).toHaveBeenCalledWith(
      '"collapse-after" "1" ignored for category of type "version-resolver"',
    )
  })

  it('applies deprecated category labels to every when branch and warns', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Features',
            labels: ['feature'],
            label: 'enhancement',
            when: [{ paths: ['src/**'] }, { path: 'docs/**' }],
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed).toEqual([
      {
        type: 'changelog',
        title: 'Features',
        exclusive: false,
        'collapse-after': -1,
        'semver-increment': 'patch',
        when: [
          {
            labels: ['feature', 'enhancement'],
            'labels-mode': 'any',
            paths: ['src/**'],
            'paths-mode': 'any',
          },
          {
            labels: ['feature', 'enhancement'],
            'labels-mode': 'any',
            paths: ['docs/**'],
            'paths-mode': 'any',
          },
        ],
      },
    ])

    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining(
        "deprecated 'categories[*].label' or 'categories[*].labels'",
      ),
    )
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining(migrationDocumentationUrl),
    )
  })

  it('throws when exclusive is set on pre-categories', () => {
    const config = configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      categories: [
        {
          type: 'pre-include',
          when: { paths: ['src/**'] },
          exclusive: true,
        },
      ],
    })

    expect(() =>
      mergeInputAndConfig({
        config,
        input: commonConfigSchema.parse({}),
        logger,
      }),
    ).toThrow(
      '"exclusive" can only be set on categories of type "changelog" or "version-resolver"; it cannot be used on category of type "pre-include".',
    )
  })

  it('defaults an omitted category type to changelog during parsing', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Features',
            exclusive: true,
            'collapse-after': 0,
            'semver-increment': 'minor',
            when: {
              label: 'feature',
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed).toEqual([
      {
        type: 'changelog',
        title: 'Features',
        exclusive: true,
        'collapse-after': 0,
        'semver-increment': 'minor',
        when: [
          {
            labels: ['feature'],
            'labels-mode': 'any',
            paths: [],
            'paths-mode': 'any',
          },
        ],
      },
    ])
  })

  it('normalizes when.label as a single labels entry', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Fixes',
            when: {
              label: 'bug',
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: ['bug'],
        'labels-mode': 'any',
        paths: [],
        'paths-mode': 'any',
      },
    ])
  })

  it('normalizes when.path as a single paths entry', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Source changes',
            when: {
              path: 'src/**',
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: [],
        'labels-mode': 'any',
        paths: ['src/**'],
        'paths-mode': 'any',
      },
    ])
  })

  it('combines when.label and when.labels into one label predicate set', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Fixes',
            when: {
              label: 'bug',
              labels: ['urgent'],
              'labels-mode': 'all',
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: ['urgent', 'bug'],
        'labels-mode': 'all',
        paths: [],
        'paths-mode': 'any',
      },
    ])
  })

  it('combines when.path and when.paths into one path predicate set', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Code and docs',
            when: {
              path: 'docs/**',
              paths: ['src/**'],
              'paths-mode': 'all',
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: [],
        'labels-mode': 'any',
        paths: ['src/**', 'docs/**'],
        'paths-mode': 'all',
      },
    ])
  })

  it('normalizes conventional matcher shorthands inside when conditions', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Features',
            when: {
              conventional: {
                type: 'feat',
                scope: 'ui',
                breaking: true,
              },
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: [],
        'labels-mode': 'any',
        paths: [],
        'paths-mode': 'any',
        conventional: {
          types: ['feat'],
          scopes: ['ui'],
          breaking: true,
        },
      },
    ])
  })

  it('normalizes conventional true to any conventional title matcher', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Conventional',
            when: { conventional: true },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: [],
        'labels-mode': 'any',
        paths: [],
        'paths-mode': 'any',
        conventional: {
          types: [],
          scopes: [],
          breaking: undefined,
        },
      },
    ])
  })

  it('normalizes conventional empty object to any conventional title matcher with warning', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Conventional',
            when: { conventional: {} },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([
      {
        labels: [],
        'labels-mode': 'any',
        paths: [],
        'paths-mode': 'any',
        conventional: {
          types: [],
          scopes: [],
          breaking: undefined,
        },
      },
    ])
    expect(logger.warning).toHaveBeenCalledWith(
      "Use 'conventional: true' instead of 'conventional: {}' to match any conventional title.",
    )
  })

  it('drops conditions that only set labels-mode without configuring labels or paths', () => {
    const parsed = parseCategories(
      {
        categories: [
          {
            title: 'Everything else',
            when: {
              'labels-mode': 'exactly',
            },
          },
        ],
      },
      {
        'exclude-labels': [],
        'exclude-paths': [],
        'include-labels': [],
        'include-paths': [],
        'version-resolver': configSchemaDefaults['version-resolver'],
      },
      logger,
    )

    expect(parsed[0]?.when).toEqual([])
  })
})
