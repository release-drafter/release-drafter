import { getOctokit, paginateGraphql } from 'src/common'
import { getGqlQuery } from './get-query'
import _ from 'lodash'

export const findCommitsWithPr = async (params: {
  since: string | undefined
  paginationdataPath: string[]
  graphQlVariables: {
    name: string
    owner: string
    targetCommitish: string
    withPullRequestBody: boolean
    withPullRequestURL: boolean
    withBaseRefName: boolean
    withHeadRefName: boolean
    pullRequestLimit: number
    historyLimit: number
  }
}) => {
  const { paginationdataPath, graphQlVariables, since } = params
  const octokit = getOctokit()

  const requestParameters = since
    ? { ...graphQlVariables, since: since }
    : graphQlVariables

  const data = await paginateGraphql(
    octokit.graphql,
    getGqlQuery('find-commits-with-pr'),
    requestParameters,
    paginationdataPath
  )

  /**
   * TODO: Improve typing here
   */
  const commits: {
    committedDate: string
    id: string
    associatedPullRequests: {
      nodes: {
        number: string
        baseRepository: { nameWithOwner: string }
        merged: boolean
      }[]
    }
  }[] = _.get(data, [...paginationdataPath, 'nodes'])

  if (since) {
    // GraphQL call is inclusive of commits from the specified dates.  This means the final
    // commit from the last tag is included, so we remove this here.
    return commits.filter((commit) => commit.committedDate != since)
  } else {
    return commits
  }
}
