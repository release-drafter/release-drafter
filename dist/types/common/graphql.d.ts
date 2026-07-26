import type { graphql } from '@octokit/graphql';
import type { Octokit } from './get-octokit.js';
import type { TypedDocumentString } from '../types/github.graphql.generated.js';
export declare const executeGraphql: <TData, TVariables extends Record<string, unknown>>(client: typeof graphql, document: TypedDocumentString<TData, TVariables>, variables: TVariables) => Promise<TData>;
/**
 * Execute a generated GraphQL document and merge its paginated connection.
 *
 * The document must follow the plugin's conventions: a single `$cursor`
 * variable and a connection containing `pageInfo` plus `nodes` or `edges`.
 */
export declare const paginateGraphql: <TData extends object, TVariables extends Record<string, unknown>>(client: Octokit['graphql'], document: TypedDocumentString<TData, TVariables>, variables: TVariables) => Promise<TData>;
