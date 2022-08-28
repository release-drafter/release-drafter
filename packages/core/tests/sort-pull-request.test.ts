import { describe, it, expect } from '@jest/globals'
import { sortPullRequests } from '../src/index.js'
import { SORT_BY, SORT_DIRECTIONS } from '../src/enums.js'

const pullRequests = [
	{
		title: 'b',
		mergedAt: '2020-01-01',
		number: 1,
	},
	{
		title: 'a',
		mergedAt: '2020-01-02',
		number: 2,
	},
]

const pullRequestWithSameDate = [
	{
		title: 'b',
		mergedAt: '2020-01-01',
		number: 1,
	},
	{
		title: 'a',
		mergedAt: '2020-01-01',
		number: 2,
	},
]

describe('Sort Pull Request', () => {
	it('should sort pull request merged at ascending', () => {
		const sorted = sortPullRequests(
			pullRequests as never,
			SORT_BY.mergedAt,
			SORT_DIRECTIONS.ascending,
		)
		expect(sorted).toHaveLength(2)
		expect(sorted[0].number).toBe(1)
		expect(sorted[1].number).toBe(2)
	})
	it('should sort pull request merged at descending', () => {
		const sorted = sortPullRequests(
			pullRequests as never,
			SORT_BY.mergedAt,
			SORT_DIRECTIONS.descending,
		)
		expect(sorted).toHaveLength(2)
		expect(sorted[0].number).toBe(2)
		expect(sorted[1].number).toBe(1)
	})
	it('should sort pull request title ascending', () => {
		const sorted = sortPullRequests(
			pullRequests as never,
			SORT_BY.title,
			SORT_DIRECTIONS.ascending,
		)
		expect(sorted).toHaveLength(2)
		expect(sorted[0].title).toBe('a')
		expect(sorted[1].title).toBe('b')
	})
	it('should sort pull request title descending', () => {
		const sorted = sortPullRequests(
			pullRequests as never,
			SORT_BY.title,
			SORT_DIRECTIONS.descending,
		)
		expect(sorted).toHaveLength(2)
		expect(sorted[0].title).toBe('b')
		expect(sorted[1].title).toBe('a')
	})
	it('should preserve order when sorting ascending by date with similar dates', () => {
		const sorted = sortPullRequests(
			pullRequestWithSameDate as never,
			SORT_BY.mergedAt,
			SORT_DIRECTIONS.ascending,
		)
		expect(sorted).toHaveLength(2)
		expect(sorted[0].number).toBe(1)
		expect(sorted[1].number).toBe(2)
	})
	it('should preserve order when sorting descending by date with similar dates', () => {
		const sorted = sortPullRequests(
			pullRequestWithSameDate as never,
			SORT_BY.mergedAt,
			SORT_DIRECTIONS.descending,
		)
		expect(sorted).toHaveLength(2)
		expect(sorted[0].number).toBe(1)
		expect(sorted[1].number).toBe(2)
	})
})
