import type { Octokit } from './get-octokit.ts'
import type { Logger } from './logger.ts'

export type GitHubContext = {
  repo: { owner: string; repo: string }
  ref?: string
  serverUrl: string
  octokit: Octokit
  logger: Logger
  /**
   * Set for forges with no GraphQL API (Gitea, Forgejo), which take the REST-only
   * code paths. Resolved once by {@link resolveRestOnly} and carried here so the
   * decision is made at the edge rather than re-derived from the environment
   * deep in the call graph. Absent means GraphQL, as on GitHub.
   */
  restOnly?: boolean
}
