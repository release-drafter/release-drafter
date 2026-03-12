import process from 'node:process'
import * as core from '@actions/core'
import { getOctokit as createOctokit } from '@actions/github'

export const getOctokit = () => {
  return createOctokit(process.env.GITHUB_TOKEN || '', {
    log: { ...core, warn: core.warning },
    request: {
      /**
       * Allows nock to intercept requests in tests
       */
      fetch: global.fetch,
    },
  })
}

export type Octokit = ReturnType<typeof getOctokit>
