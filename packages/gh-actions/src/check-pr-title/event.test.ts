import { describe, expect, it } from 'vitest'
import { parsePullRequestEvent } from './event.ts'

describe('check-pr-title event parsing', () => {
  it('uses the current edited title, labels, and number', () => {
    expect(
      parsePullRequestEvent('pull_request', {
        action: 'edited',
        number: 42,
        changes: { title: { from: 'Old title' } },
        pull_request: {
          title: 'feat: current title',
          labels: [{ name: 'approved' }],
          base: { ref: 'main' },
        },
      }),
    ).toEqual({
      number: 42,
      title: 'feat: current title',
      labels: ['approved'],
      baseRef: 'main',
    })
  })

  it('rejects malformed pull request events clearly', () => {
    expect(() =>
      parsePullRequestEvent('pull_request', {
        action: 'edited',
        number: 42,
        pull_request: { labels: [] },
      }),
    ).toThrow('Malformed pull request event:')
  })

  it('rejects unsupported event names and pull request actions clearly', () => {
    expect(() => parsePullRequestEvent('push', {})).toThrow(
      "Unsupported event 'push'",
    )
    expect(() =>
      parsePullRequestEvent('pull_request', {
        action: 'closed',
        number: 42,
        pull_request: {
          title: 'feat: done',
          labels: [],
          base: { ref: 'main' },
        },
      }),
    ).toThrow("Unsupported pull request action 'closed'")
  })
})
