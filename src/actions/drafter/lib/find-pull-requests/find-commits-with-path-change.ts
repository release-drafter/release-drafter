import { getOctokit, paginateGraphql } from 'src/common'
import { getGqlQuery } from './get-query'
import { Config } from 'src/types'
import _ from 'lodash'

export const findCommitsWithPathChange = async (params: {
  since: string | undefined
  paths: Config['include-paths']
  paginationdataPath: string[]
  graphQlVariables: {
    name: string
    owner: string
    targetCommitish: string
  }
}) => {
  const { paginationdataPath, graphQlVariables, since, paths } = params
  const octokit = getOctokit()
  const commitIdsMatchingPaths: Record<string, Set<string>> = {}
  let hasFoundCommits = false

  for (const path of paths) {
    const pathData = await paginateGraphql(
      octokit.graphql,
      getGqlQuery('find-commits-with-path-changes'),
      { ...graphQlVariables, since: since, path },
      paginationdataPath
    )
    const commitsWithPathChanges = _.get(pathData, [
      ...paginationdataPath,
      'nodes'
    ])

    commitIdsMatchingPaths[path] = commitIdsMatchingPaths[path] || new Set([])

    for (const { id } of commitsWithPathChanges) {
      hasFoundCommits = true
      commitIdsMatchingPaths[path].add(id)
    }
  }

  return { commitIdsMatchingPaths, hasFoundCommits }
}
