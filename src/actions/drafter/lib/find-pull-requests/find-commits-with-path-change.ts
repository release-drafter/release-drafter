import { getOctokit, paginateGraphql } from 'src/common'
import { getGqlQuery } from './get-query'
import {
  FindCommitsWithPathChangesQueryQuery,
  FindCommitsWithPathChangesQueryQueryVariables
} from './graphql/find-commits-with-path-changes.graphql.generated'
import { Config } from '../../config'

export const findCommitsWithPathChange = async (
  paths: Config['include-paths'],
  params: Omit<FindCommitsWithPathChangesQueryQueryVariables, 'path'>
) => {
  const octokit = getOctokit()
  const commitIdsMatchingPaths: Record<string, Set<string>> = {}
  let hasFoundCommits = false

  for (const path of paths) {
    const data = await paginateGraphql<FindCommitsWithPathChangesQueryQuery>(
      octokit.graphql,
      getGqlQuery('find-commits-with-path-changes'),
      { ...params, path },
      ['repository', 'object', 'history']
    )

    if (data.repository?.object?.__typename !== 'Commit') {
      throw new Error('Query returned an unexpected result')
    }

    const commits = (data.repository?.object?.history.nodes || []).filter(
      (c) => !!c
    )

    commitIdsMatchingPaths[path] = commitIdsMatchingPaths[path] || new Set([])

    for (const { id } of commits) {
      hasFoundCommits = true
      commitIdsMatchingPaths[path].add(id)
    }
  }

  return { commitIdsMatchingPaths, hasFoundCommits }
}
