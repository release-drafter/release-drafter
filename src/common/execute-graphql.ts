import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import type { graphql } from '@octokit/graphql'
import { print } from 'graphql'

export const executeGraphql = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  client: typeof graphql,
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
): Promise<TData> => client<TData>(print(document), variables)
