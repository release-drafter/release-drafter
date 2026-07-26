import * as core from '@actions/core'
import { getOctokit as createOctokit } from '@actions/github'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { retry } from '@octokit/plugin-retry'
import type { Octokit } from '#src/common/get-octokit.ts'

export const getActionOctokit = (token: string) =>
  createOctokit(
    token,
    { log: { ...core, warn: core.warning } },
    paginateGraphQL,
    retry,
  ) as unknown as Octokit
