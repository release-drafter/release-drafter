import process from 'node:process'
import * as core from '@actions/core'
import { getOctokit as createOctokit } from '@actions/github'
import {
  paginateGraphQL,
  type paginateGraphQLInterface,
} from '@octokit/plugin-paginate-graphql'
import { type RetryPlugin, retry } from '@octokit/plugin-retry'

export const getOctokit = (token = process.env.GITHUB_TOKEN || '') => {
  return createOctokit(
    token,
    {
      log: { ...core, warn: core.warning },
    },
    paginateGraphQL,
    retry,
  ) as ReturnType<typeof createOctokit> & paginateGraphQLInterface & RetryPlugin
}

export type Octokit = ReturnType<typeof getOctokit>
