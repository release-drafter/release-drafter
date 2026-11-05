import { assert, describe, expect, it, vi } from 'vitest'
import { noopLogger } from '../ports.ts'
import type { Change, PullRequest } from '../types.ts'
import { sortChanges } from './sort-changes.ts'

const pullRequests: PullRequest[] = [
  { number: 1, title: 'B', mergedAt: '2026-01-02' },
  { number: 2, title: 'A', mergedAt: '2026-01-01' },
  { number: 3, title: 'A', mergedAt: '2026-01-01' },
  { number: 4, title: 'C', mergedAt: null },
  { number: 5, title: 'D' },
]
const changes: Change[] = pullRequests.map((pullRequest) => ({
  type: 'pull-request',
  pullRequest,
}))
const numbers = (changes: Change[]) =>
  changes.flatMap((change) =>
    change.type === 'pull-request' ? [change.pullRequest.number] : [],
  )

describe('change sorting', () => {
  it.each([
    ['title', 'ascending', [2, 3, 1, 4, 5]],
    ['title', 'descending', [5, 4, 1, 2, 3]],
    ['date', 'ascending', [2, 3, 1, 4, 5]],
    ['date', 'descending', [1, 2, 3, 4, 5]],
  ] as const)(
    'sorts by %s in %s order without mutating inputs',
    (sortBy, direction, expected) => {
      const original = structuredClone(changes)
      const result = sortChanges({
        changes,
        logger: noopLogger,
        config: { 'sort-by': sortBy, 'sort-direction': direction },
      })
      expect(numbers(result)).toEqual(expected)
      expect(changes).toEqual(original)
      assert(result[0].type === 'pull-request')
      result[0].pullRequest.labels = ['changed']
      expect(changes).toEqual(original)
    },
  )

  it.each(['ascending', 'descending'] as const)(
    'sorts missing dates last in %s order regardless of input order',
    (direction) => {
      const result = sortChanges({
        changes: [...changes].reverse(),
        logger: noopLogger,
        config: { 'sort-by': 'date', 'sort-direction': direction },
      })
      expect(numbers(result)).toEqual(
        direction === 'ascending' ? [3, 2, 1, 5, 4] : [1, 3, 2, 5, 4],
      )
    },
  )

  it.each(['ascending', 'descending'] as const)(
    'warns and sorts invalid dates last in %s order',
    (direction) => {
      const warning = vi.fn()
      const result = sortChanges({
        changes: [
          {
            type: 'pull-request',
            pullRequest: { number: 6, title: 'Invalid', mergedAt: 'invalid' },
          },
          ...changes.slice(0, 3),
        ],
        logger: { ...noopLogger, warning },
        config: { 'sort-by': 'date', 'sort-direction': direction },
      })
      expect(numbers(result)).toEqual(
        direction === 'ascending' ? [2, 3, 1, 6] : [1, 2, 3, 6],
      )
      expect(warning).toHaveBeenCalledWith(
        'Failed to parse change date "invalid". Sorting it last.',
      )
    },
  )
})
