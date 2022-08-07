import _ from 'lodash'
import { graphql } from '@octokit/graphql/dist-types/types.js'
import { RequestParameters } from '@octokit/plugin-paginate-rest/dist-types/types.js'

/**
 * Utility function to paginate a GraphQL function using Relay-style cursor pagination.
 *
 * @param {graphql} queryFunction - function used to query the GraphQL API
 * @param {string} query - GraphQL query, must include `nodes` and `pageInfo` fields for the field that will be paginated
 * @param {RequestParameters} variables
 * @param {string[]} paginatePath - path to field to paginate
 */
export async function paginate(
	queryFunction: graphql,
	query: string,
	variables: RequestParameters,
	paginatePath: string[],
) {
	const nodesPath = [...paginatePath, 'nodes']
	const pageInfoPath = [...paginatePath, 'pageInfo']
	const endCursorPath = [...pageInfoPath, 'endCursor']
	const hasNextPagePath = [...pageInfoPath, 'hasNextPage']
	const hasNextPage = (data: unknown) => _.get(data, hasNextPagePath)

	const data = await queryFunction<object>(query, variables)

	if (!_.has(data, nodesPath)) {
		throw new Error(
			"Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field.",
		)
	}

	if (
		!_.has(data, pageInfoPath) ||
		!_.has(data, endCursorPath) ||
		!_.has(data, hasNextPagePath)
	) {
		throw new Error(
			"Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field.",
		)
	}

	while (hasNextPage(data)) {
		const newData = await queryFunction(query, {
			...variables,
			after: _.get(data, [...pageInfoPath, 'endCursor']),
		})
		const newNodes = _.get(newData, nodesPath)
		const newPageInfo = _.get(newData, pageInfoPath)

		_.set(data, pageInfoPath, newPageInfo)
		_.update(data, nodesPath, (d) => [...d, ...newNodes])
	}

	return data
}
