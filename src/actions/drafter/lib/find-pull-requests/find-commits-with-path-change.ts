import { executeGraphql, getOctokit } from 'src/common'
import type { Config } from '../../config'
import {
  FindCommitsWithPathChangesQueryDocument,
  type FindCommitsWithPathChangesQueryQueryVariables,
} from './graphql/find-commits-with-path-changes.graphql.generated'

/**
 * @see https://docs.github.com/en/graphql/reference/objects#commit
 */
export const findCommitsWithPathChange = async (
  paths: Config['include-paths'],
  params: {
    name: string
    owner: string
    targetCommitish: string
    comparisonCommitIds: Set<string>
  },
) => {
  const octokit = getOctokit()
  const commitIdsMatchingPaths: Record<string, Set<string>> = {}
  let hasFoundCommits = false

  for (const path of paths) {
    commitIdsMatchingPaths[path] = new Set()
    let after: FindCommitsWithPathChangesQueryQueryVariables['after'] = null

    while (true) {
      const variables: FindCommitsWithPathChangesQueryQueryVariables = {
        name: params.name,
        owner: params.owner,
        targetCommitish: params.targetCommitish,
        path,
        after,
      }
      const data = await executeGraphql(
        octokit.graphql,
        FindCommitsWithPathChangesQueryDocument,
        variables,
      )

      if (data.repository?.object?.__typename !== 'Commit') {
        throw new Error('Query returned an unexpected result')
      }

      const nodes = (data.repository.object.history.nodes ?? []).filter(
        (c): c is NonNullable<typeof c> => c != null,
      )

      const matchingNodes = nodes.filter((c) =>
        params.comparisonCommitIds.has(c.id),
      )

      for (const { id } of matchingNodes) {
        hasFoundCommits = true
        commitIdsMatchingPaths[path].add(id)
      }

      const { hasNextPage, endCursor } = data.repository.object.history.pageInfo

      // Stop if no more pages or if none of this page's commits are in the
      // comparison range (we've gone past the base ref)
      if (!hasNextPage || matchingNodes.length === 0) break

      after = endCursor ?? null
    }
  }

  return { commitIdsMatchingPaths, hasFoundCommits }
}
