import { getOctokit as createOctokit } from '@actions/github'
import * as core from '@actions/core'

export const getOctokit = () => {
  return createOctokit(process.env.GITHUB_TOKEN || '', {
    log: { ...core, warn: core.warning },
    request: {
      /**
       * Allows nock to intercept requests in tests
       */
      fetch: global.fetch
    }
  })
}

export type Octokit = ReturnType<typeof getOctokit>
