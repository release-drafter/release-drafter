import type { RequestParameters } from '@octokit/graphql/types'

const getPath = (obj: unknown, path: string[]) =>
  // biome-ignore lint/suspicious/noExplicitAny: acc is intentionally untyped for dynamic path traversal
  path.reduce((acc: any, key) => acc?.[key], obj)

const hasPath = (obj: unknown, path: string[]) =>
  getPath(obj, path) !== undefined

const setPath = (obj: unknown, path: string[], value: unknown) => {
  const lastKey = path[path.length - 1]
  if (lastKey === undefined) return
  const parent = getPath(obj, path.slice(0, -1)) as Record<string, unknown>
  parent[lastKey] = value
}

/**
 * Utility function to paginate a GraphQL function using Relay-style cursor pagination.
 *
 * @param {Function} queryFn - function used to query the GraphQL API
 * @param {string} query - GraphQL query, must include `nodes` and `pageInfo` fields for the field that will be paginated
 * @param {Object} variables
 * @param {string[]} paginatePath - path to field to paginate
 */
export async function paginateGraphql<T extends object>(
  client: typeof import('@octokit/graphql').graphql,
  query: string,
  requestParameters: RequestParameters,
  paginatePath: string[],
) {
  const nodesPath = [...paginatePath, 'nodes']
  const pageInfoPath = [...paginatePath, 'pageInfo']
  const endCursorPath = [...pageInfoPath, 'endCursor']
  const hasNextPagePath = [...pageInfoPath, 'hasNextPage']
  const hasNextPage = (data: T) => getPath(data, hasNextPagePath)

  const data = await client<T>(query, requestParameters)

  if (!hasPath(data, nodesPath)) {
    throw new Error(
      "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field.",
    )
  }

  if (
    !hasPath(data, pageInfoPath) ||
    !hasPath(data, endCursorPath) ||
    !hasPath(data, hasNextPagePath)
  ) {
    throw new Error(
      "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field.",
    )
  }

  while (hasNextPage(data)) {
    const newData = await client<T>(query, {
      ...requestParameters,
      after: getPath(data, [...pageInfoPath, 'endCursor']),
    })
    const newNodes = getPath(newData, nodesPath)
    const newPageInfo = getPath(newData, pageInfoPath)

    setPath(data, pageInfoPath, newPageInfo)
    setPath(data, nodesPath, [...getPath(data, nodesPath), ...newNodes])
  }

  return data
}
