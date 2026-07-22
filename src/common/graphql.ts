import type { graphql } from '@octokit/graphql'
import type { Octokit } from '#src/common/get-octokit.ts'
import type { TypedDocumentString } from '#src/types/github.graphql.generated.ts'

export const executeGraphql = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  client: typeof graphql,
  document: TypedDocumentString<TData, TVariables>,
  variables: TVariables,
): Promise<TData> => client<TData>(document.toString(), variables)

/**
 * Execute a generated GraphQL document and merge its paginated connection.
 *
 * The document must follow the plugin's conventions: a single `$cursor`
 * variable and a connection containing `pageInfo` plus `nodes` or `edges`.
 */
export const paginateGraphql = <
  TData extends object,
  TVariables extends Record<string, unknown>,
>(
  client: Octokit['graphql'],
  document: TypedDocumentString<TData, TVariables>,
  variables: TVariables,
): Promise<TData> => client.paginate<TData>(document.toString(), variables)
