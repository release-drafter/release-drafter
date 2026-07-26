import { Octokit as OctokitCore } from '@octokit/core';
import { type paginateGraphQLInterface } from '@octokit/plugin-paginate-graphql';
import { type RetryPlugin } from '@octokit/plugin-retry';
import { type Logger } from './logger.js';
declare const GitHub: typeof OctokitCore & import("@octokit/core/types").Constructor<import("@octokit/plugin-rest-endpoint-methods").Api & RetryPlugin & paginateGraphQLInterface & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
}>;
export declare const getOctokit: (token?: string, options?: {
    baseUrl?: string;
    logger?: Logger;
}) => InstanceType<typeof GitHub> & paginateGraphQLInterface & RetryPlugin;
export type Octokit = ReturnType<typeof getOctokit>;
export {};
