import process from 'node:process'
import { Octokit as OctokitCore } from '@octokit/core'
import {
  paginateGraphQL,
  type paginateGraphQLInterface,
} from '@octokit/plugin-paginate-graphql'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { type RetryPlugin, retry } from '@octokit/plugin-retry'
import { type Logger, noopLogger } from './logger.ts'

export const MISSING_TOKEN_MESSAGE =
  "Unable to find a token. Please see input 'token'."

const GitHub = OctokitCore.plugin(
  restEndpointMethods,
  paginateRest,
  paginateGraphQL,
  retry,
)

export const getOctokit = (
  token = process.env.GITHUB_TOKEN || '',
  options: { baseUrl?: string; logger?: Logger } = {},
) => {
  if (!token) throw new Error(MISSING_TOKEN_MESSAGE)

  const logger = options.logger ?? noopLogger
  return new GitHub({
    auth: token,
    baseUrl: options.baseUrl ?? process.env.GITHUB_API_URL,
    log: {
      debug: logger.debug,
      error: logger.error,
      info: logger.info,
      warn: logger.warning,
    },
  }) as InstanceType<typeof GitHub> & paginateGraphQLInterface & RetryPlugin
}

export type Octokit = ReturnType<typeof getOctokit>
