import type { graphql } from '@octokit/graphql'
import type { TypedDocumentString } from '#src/types/github.graphql.generated.ts'

export const executeGraphql = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  client: typeof graphql,
  document: TypedDocumentString<TData, TVariables>,
  variables: TVariables,
): Promise<TData> => client<TData>(document.toString(), variables)
