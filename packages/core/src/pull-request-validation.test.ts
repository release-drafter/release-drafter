import { describe, expect, it, vi } from 'vitest'
import { configSchema, mergeInputAndConfig } from './config/index.ts'
import {
  evaluatePullRequest,
  projectPullRequestValidationCategories,
} from './pull-request-validation.ts'
import type { ParsedConfig } from './types.ts'

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

describe('pull request validation', () => {
  it('accepts a title matching a conventional changelog category', () => {
    expect(
      evaluatePullRequest(
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
      evaluatePullRequest(
        { title: 'Add search' },
        categories([
          { title: 'Features', when: { conventional: { type: 'feat' } } },
        ]),
      ),
    ).toEqual({ valid: false, skipped: false, selectedCategoryCount: 0 })
  })

  it('rejects a match that selects only an unconditional fallback', () => {
    expect(
      evaluatePullRequest(
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
      evaluatePullRequest(
        { title: 'not conventional', labels: ['skip-changelog'] },
        categories([
          { type: 'pre-exclude', when: { label: 'skip-changelog' } },
          { title: 'Features', when: { conventional: true } },
        ]),
      ),
    ).toEqual({ valid: true, skipped: true })
  })

  it('does not use paths to qualify a conventional title', () => {
    const parsed = categories([
      {
        title: 'Documentation',
        when: { conventional: { type: 'docs' }, paths: ['docs/**'] },
      },
    ])
    expect(
      evaluatePullRequest(
        { title: 'docs: update guide', changedFiles: ['src/index.ts'] },
        parsed,
      ).valid,
    ).toBe(true)
    expect(
      evaluatePullRequest(
        { title: 'docs: update guide', changedFiles: ['docs/guide.md'] },
        parsed,
      ).valid,
    ).toBe(true)
  })

  it('accepts a configured label without a conventional title', () => {
    const parsed = categories([
      {
        title: 'Features',
        when: { label: 'feature' },
      },
    ])
    expect(
      evaluatePullRequest({ title: 'Add search', labels: ['feature'] }, parsed)
        .valid,
    ).toBe(true)
  })

  it('requires title and label predicates from the same condition', () => {
    const parsed = categories([
      {
        title: 'Approved features',
        when: { conventional: { type: 'feat' }, label: 'approved' },
      },
    ])
    expect(
      evaluatePullRequest(
        { title: 'feat: add search', labels: ['approved'] },
        parsed,
      ).valid,
    ).toBe(true)
    expect(
      evaluatePullRequest({ title: 'feat: add search', labels: [] }, parsed)
        .valid,
    ).toBe(false)
  })

  it('drops path-only branches', () => {
    const parsed = categories([
      { title: 'Path only', when: { path: 'docs/**' } },
      { title: 'Features', when: { conventional: { type: 'feat' } } },
    ])

    expect(projectPullRequestValidationCategories(parsed)).toEqual([
      expect.objectContaining({ title: 'Features' }),
    ])
    expect(
      evaluatePullRequest(
        { title: 'invalid', changedFiles: ['docs/guide.md'] },
        parsed,
      ).valid,
    ).toBe(false)
  })

  it('accepts a conventional version-resolver category', () => {
    expect(
      evaluatePullRequest(
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
