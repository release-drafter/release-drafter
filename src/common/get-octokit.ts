import process from 'node:process'
import * as core from '@actions/core'
import { getOctokit as createOctokit } from '@actions/github'
import {
  paginateGraphQL,
  type paginateGraphQLInterface,
} from '@octokit/plugin-paginate-graphql'
import { type RetryPlugin, retry } from '@octokit/plugin-retry'

export const getOctokit = () => {
  return createOctokit(
    process.env.GITHUB_TOKEN || '',
    {
      log: { ...core, warn: core.warning },
      request: {
        /**
         * Allows nock to intercept requests in tests
         */
        fetch: global.fetch,
      },
    },
    paginateGraphQL,
    retry,
  ) as ReturnType<typeof createOctokit> & paginateGraphQLInterface & RetryPlugin
}

export type Octokit = ReturnType<typeof getOctokit>
