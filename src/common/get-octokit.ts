import process from 'node:process'
import * as core from '@actions/core'
import { getOctokit as createOctokit } from '@actions/github'
import {
  paginateGraphQL,
  type paginateGraphQLInterface,
} from '@octokit/plugin-paginate-graphql'
import { type RetryPlugin, retry } from '@octokit/plugin-retry'

export const getOctokit = () => {
  // Deliberately no `request` option: `@octokit/core` shallow-merges it, so
  // supplying one replaces the proxy-aware `fetch` and agent that
  // `@actions/github` builds from `http_proxy`/`https_proxy`. That silently
  // disables proxy support, which GitHub Enterprise Server and corporate-proxy
  // setups depend on.
  //
  // @see src/tests/get-octokit-proxy.test.ts
  return createOctokit(
    process.env.GITHUB_TOKEN || '',
    {
      log: { ...core, warn: core.warning },
    },
    paginateGraphQL,
    retry,
  ) as ReturnType<typeof createOctokit> & paginateGraphQLInterface & RetryPlugin
}

export type Octokit = ReturnType<typeof getOctokit>
