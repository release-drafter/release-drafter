import * as core from '@actions/core'
import { getOctokit as createOctokit } from '@actions/github'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { retry } from '@octokit/plugin-retry'
import { MISSING_TOKEN_MESSAGE, type Octokit } from '#src/common/get-octokit.ts'

/**
 * The surface the drafter and autolabeler consume that the Toolkit's return type
 * still describes. Asserting it turns `restEndpointMethods` or `paginateRest`
 * going missing into a build error rather than a runtime failure.
 *
 * `graphql.paginate` is deliberately absent: the Toolkit's `getOctokit` does not
 * thread plugin types through its return type, so `paginateGraphQL` is applied at
 * runtime but invisible to TypeScript. That erasure is what forces the cast.
 */
type UsedOctokit = Pick<Octokit, 'rest' | 'paginate'>

/**
 * Builds the client through the Actions Toolkit so its proxy handling and
 * `GITHUB_API_URL` default are preserved. The Toolkit returns its own class, so
 * the result is structurally distinct from {@link Octokit} despite being
 * assembled from the same plugins, hence the cast.
 */
export const getActionOctokit = (token: string): Octokit => {
  if (!token) throw new Error(MISSING_TOKEN_MESSAGE)

  const octokit = createOctokit(
    token,
    { log: { ...core, warn: core.warning } },
    paginateGraphQL,
    retry,
  )

  return octokit satisfies UsedOctokit as unknown as Octokit
}
