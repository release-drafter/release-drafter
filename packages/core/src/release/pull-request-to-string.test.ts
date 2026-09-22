import { describe, expect, it } from 'vitest'
import { configSchema } from '../config/config.schema.ts'
import type { PullRequest } from '../types.ts'
import type { ChangeGroup } from './group-changes.ts'
import { pullRequestToString } from './pull-request-to-string.ts'

const config = (overrides: Record<string, unknown> = {}) =>
  configSchema.parse({ template: '$CHANGES', ...overrides })

const pullRequest = (
  number: number,
  overrides: Partial<PullRequest> = {},
): PullRequest => ({
  number,
  title: `Change ${number}`,
  author: {
    login: `author-${number}`,
    url: `https://github.com/author-${number}`,
  },
  ...overrides,
})

const change = (pullRequests: PullRequest[], title?: string): ChangeGroup => ({
  pullRequests,
  representative: pullRequests[pullRequests.length - 1],
  title: title ?? pullRequests[pullRequests.length - 1].title,
})

const render = (changes: ChangeGroup[], overrides?: Record<string, unknown>) =>
  pullRequestToString({
    changes,
    commits: [],
    serverUrl: 'https://github.com',
    config: config(overrides),
  })

describe('pullRequestToString', () => {
  it('renders a single change with the default template', () => {
    expect(render([change([pullRequest(42)])])).toBe(
      '* Change 42 (#42) @author-42',
    )
  })

  it('renders $NUMBERS of a single change as its own number', () => {
    expect(
      render([change([pullRequest(42)])], {
        'change-template': '* $TITLE ($NUMBERS)',
      }),
    ).toBe('* Change 42 (#42)')
  })

  it('renders $NUMBERS of a merged change, oldest first', () => {
    const merged = change(
      [pullRequest(308), pullRequest(310), pullRequest(316)],
      'Bump njord.version from 0.9.1 to 0.9.5',
    )

    expect(render([merged], { 'change-template': '* $TITLE ($NUMBERS)' })).toBe(
      '* Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)',
    )
  })

  it('takes single valued variables from the newest pull request', () => {
    const merged = change([
      pullRequest(1, { body: 'first', url: 'https://example.com/1' }),
      pullRequest(2, { body: 'second', url: 'https://example.com/2' }),
    ])

    expect(
      render([merged], { 'change-template': '$NUMBER $AUTHOR $BODY $URL' }),
    ).toBe('2 author-2 second https://example.com/2')
  })

  it('lists the authors of every merged pull request without duplicates', () => {
    const merged = change([
      pullRequest(1, { author: { login: 'grace' } }),
      pullRequest(2, { author: { login: 'ada' } }),
      pullRequest(3, { author: { login: 'grace' } }),
    ])

    expect(render([merged], { 'change-template': '$AUTHORS' })).toBe(
      '@ada, @grace',
    )
  })

  it('escapes the merged title', () => {
    const merged = change([pullRequest(1), pullRequest(2)], 'Bump _lib_ to 2.0')

    expect(
      render([merged], {
        'change-template': '$TITLE',
        'change-title-escapes': '_',
      }),
    ).toBe('Bump \\_lib\\_ to 2.0')
  })
})
