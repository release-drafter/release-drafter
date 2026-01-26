import { getOctokit, paginateGraphql } from 'src/common'
import { getGqlQuery } from './get-query'
import {
  FindCommitsWithAssociatedPullRequestsQuery,
  FindCommitsWithAssociatedPullRequestsQueryVariables
} from './graphql/find-commits-with-pr.graphql.generated'

export const findCommitsWithPr = async (
  params: FindCommitsWithAssociatedPullRequestsQueryVariables
) => {
  const octokit = getOctokit()

  const data =
    await paginateGraphql<FindCommitsWithAssociatedPullRequestsQuery>(
      octokit.graphql,
      getGqlQuery('find-commits-with-pr'),
      params,
      ['repository', 'object', 'history']
    )

  if (data.repository?.object?.__typename !== 'Commit') {
    throw new Error('Query returned an unexpected result')
  }

  /**
   * Extract commit nodes from the paginated response
   */
  const commits = (data.repository.object.history.nodes || []).filter(
    (commit): commit is NonNullable<typeof commit> => commit != null
  )

  if (params.since) {
    // GraphQL call is inclusive of commits from the specified dates.  This means the final
    // commit from the last tag is included, so we remove this here.
    return commits.filter(
      (commit) =>
        !!commit?.committedDate && commit.committedDate != params.since
    )
  } else {
    return commits
  }
}
