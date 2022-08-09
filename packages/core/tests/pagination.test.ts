import { describe, it, expect, jest } from '@jest/globals'

import { paginate } from '../src/pagination.js'
import { CommitsWithAssociatedPullRequests } from '../src/commits.js'

describe('pagination', () => {
	it('concats pagination results', async () => {
		const queryFunction = jest.fn()
		// query is empty because we mock the result
		const query = ``

		queryFunction
			.mockReturnValueOnce(
				Promise.resolve({
					repository: {
						object: {
							history: {
								nodes: ['a', 'b', 'c'],
								pageInfo: {
									endCursor: 'aaa',
									hasNextPage: true,
								},
							},
						},
					},
				}),
			)
			.mockReturnValueOnce(
				Promise.resolve({
					repository: {
						object: {
							history: {
								nodes: ['d', 'e', 'f'],
								pageInfo: {
									endCursor: 'bbb',
									hasNextPage: false,
								},
							},
						},
					},
				}),
			)

		const data = await paginate<CommitsWithAssociatedPullRequests>(
			queryFunction as never,
			query,
			{},
			['repository', 'object', 'history'],
		)

		expect(queryFunction).toHaveBeenCalledTimes(2)
		expect(data.repository.object.history.nodes).toEqual([
			'a',
			'b',
			'c',
			'd',
			'e',
			'f',
		])
		expect(data.repository.object.history.pageInfo).toEqual({
			endCursor: 'bbb',
			hasNextPage: false,
		})
	})

	it("throws when query doesn't return `nodes` or `pageInfo` fields", async () => {
		const queryFunction = jest.fn()
		// query is empty because we mock the result
		const query = ``

		queryFunction.mockReturnValueOnce(Promise.resolve({}))

		await expect(
			paginate(queryFunction as never, query, {}, []),
		).rejects.toThrow()
	})
})
