import {
  configSchema,
  mergeInputAndConfig,
  type ParsedConfig,
} from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import {
  canSkipWithoutChangedFiles,
  evaluatePullRequestTitle,
  projectConventionalCategories,
  projectTitleCategories,
} from './evaluate-title.ts'

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}

const categories = (value: unknown[]): ParsedConfig['categories'] =>
  mergeInputAndConfig({
    config: configSchema.parse({ categories: value }),
    input: {},
    defaultCommitish: 'main',
    logger,
  }).categories

describe('check-pr-title category evaluation', () => {
  it('accepts a title matching a conventional changelog category', () => {
    expect(
      evaluatePullRequestTitle(
        { title: 'feat(api): add search' },
        categories([
          {
            title: 'Features',
            when: { conventional: { type: 'feat', scope: 'api' } },
          },
        ]),
      ),
    ).toEqual({ valid: true, skipped: false, selectedCategoryCount: 1 })
  })

  it('rejects a non-conventional or unmatched title', () => {
    expect(
      evaluatePullRequestTitle(
        { title: 'Add search' },
        categories([
          { title: 'Features', when: { conventional: { type: 'feat' } } },
        ]),
      ),
    ).toEqual({ valid: false, skipped: false, selectedCategoryCount: 0 })
  })

  it('rejects a match that selects only an unconditional fallback', () => {
    expect(
      evaluatePullRequestTitle(
        { title: 'Add search' },
        categories([
          { title: 'Features', when: { conventional: { type: 'feat' } } },
          { title: 'Other' },
        ]),
      ),
    ).toEqual({ valid: false, skipped: false, selectedCategoryCount: 1 })
  })

  it('passes an excluded pull request as skipped before projection', () => {
    expect(
      evaluatePullRequestTitle(
        { title: 'not conventional', labels: ['skip-changelog'] },
        categories([
          { type: 'pre-exclude', when: { label: 'skip-changelog' } },
          { title: 'Features', when: { conventional: true } },
        ]),
      ),
    ).toEqual({ valid: true, skipped: true })
  })

  it('preserves path correlation in a conventional condition', () => {
    const parsed = categories([
      {
        title: 'Documentation',
        when: { conventional: { type: 'docs' }, paths: ['docs/**'] },
      },
    ])
    expect(
      evaluatePullRequestTitle(
        { title: 'docs: update guide', changedFiles: ['src/index.ts'] },
        parsed,
      ).valid,
    ).toBe(false)
    expect(
      evaluatePullRequestTitle(
        { title: 'docs: update guide', changedFiles: ['docs/guide.md'] },
        parsed,
      ).valid,
    ).toBe(true)
  })

  it('preserves label correlation and drops label-only branches', () => {
    const parsed = categories([
      {
        title: 'Features',
        when: [
          { label: 'feature' },
          { conventional: { type: 'feat' }, label: 'approved' },
        ],
      },
    ])
    const projected = projectConventionalCategories(parsed)
    expect(projected).toHaveLength(1)
    expect(projected[0]?.when).toHaveLength(1)
    expect(
      evaluatePullRequestTitle(
        { title: 'feat: add search', labels: ['feature'] },
        parsed,
      ).valid,
    ).toBe(false)
    expect(
      evaluatePullRequestTitle(
        { title: 'feat: add search', labels: ['approved'] },
        parsed,
      ).valid,
    ).toBe(true)
  })

  it('keeps pre-categories while dropping path-only release branches', () => {
    const parsed = categories([
      { type: 'pre-exclude', when: { label: 'skip' } },
      { title: 'Path only', when: { path: 'docs/**' } },
      { title: 'Features', when: { conventional: { type: 'feat' } } },
    ])

    expect(projectTitleCategories(parsed)).toEqual([
      expect.objectContaining({ type: 'pre-exclude' }),
      expect.objectContaining({ title: 'Features' }),
    ])
    expect(
      canSkipWithoutChangedFiles(
        { title: 'invalid', labels: ['skip'] },
        parsed,
      ),
    ).toBe(true)
  })

  it('accepts a conventional version-resolver category', () => {
    expect(
      evaluatePullRequestTitle(
        { title: 'fix: avoid crash' },
        categories([
          {
            type: 'version-resolver',
            'semver-increment': 'patch',
            when: { conventional: { type: 'fix' } },
          },
        ]),
      ).valid,
    ).toBe(true)
  })
})
