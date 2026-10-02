import { describe, expect, it } from 'vitest'
import { noopLogger } from '../ports.ts'
import type { PullRequest } from '../types.ts'
import { sortPullRequests } from './sort-pull-requests.ts'

const pullRequests: PullRequest[] = [
  { number: 1, title: 'B', mergedAt: '2026-01-02' },
  { number: 2, title: 'A', mergedAt: '2026-01-01' },
  { number: 3, title: 'A', mergedAt: '2026-01-01' },
  { number: 4, title: 'C', mergedAt: null },
  { number: 5, title: 'D' },
]

describe('pull request sorting', () => {
  it.each([
    ['title', 'ascending', [2, 3, 1, 4, 5]],
    ['title', 'descending', [5, 4, 1, 2, 3]],
    ['merged_at', 'ascending', [2, 3, 1, 4, 5]],
    ['merged_at', 'descending', [4, 5, 1, 2, 3]],
  ] as const)(
    'sorts by %s in %s order without mutating inputs',
    (sortBy, direction, expected) => {
      const original = structuredClone(pullRequests)
      const result = sortPullRequests({
        pullRequests,
        logger: noopLogger,
        config: { 'sort-by': sortBy, 'sort-direction': direction },
      })
      expect(result.map((pr) => pr.number)).toEqual(expected)
      expect(pullRequests).toEqual(original)
      result[0].labels = ['changed']
      expect(pullRequests).toEqual(original)
    },
  )

  it.each(['ascending', 'descending'] as const)(
    'sorts missing dates in %s order regardless of input order',
    (direction) => {
      const result = sortPullRequests({
        pullRequests: [...pullRequests].reverse(),
        logger: noopLogger,
        config: { 'sort-by': 'merged_at', 'sort-direction': direction },
      })
      expect(result.map((pr) => pr.number)).toEqual(
        direction === 'ascending' ? [3, 2, 1, 5, 4] : [5, 4, 1, 3, 2],
      )
    },
  )
})
