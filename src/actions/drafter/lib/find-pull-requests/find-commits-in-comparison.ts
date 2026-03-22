import { getOctokit, paginateGraphql } from 'src/common'
import type { FindCommitsInComparisonQueryVariables } from './graphql/find-commits-in-comparison.graphql.generated'
import { FindCommitsInComparisonDocument } from './graphql/find-commits-in-comparison.graphql.generated'

export const findCommitsInComparison = async (
  params: FindCommitsInComparisonQueryVariables,
) => {
  const octokit = getOctokit()

  const data = await paginateGraphql(
    octokit.graphql,
    FindCommitsInComparisonDocument,
    params,
    ['repository', 'ref', 'compare', 'commits'],
  )

  if (!data.repository?.ref?.compare) {
    throw new Error(
      'Query returned an unexpected result: ref or comparison not found',
    )
  }

  return (data.repository.ref.compare.commits.nodes || []).filter(
    (commit): commit is NonNullable<typeof commit> => commit != null,
  )
}
