import { getOctokit, paginateGraphql } from '#src/common/index.ts'
import type { FindCommitsInComparisonQueryVariables } from '#src/types/github.graphql.generated.ts'
import { FindCommitsInComparisonDocument } from '#src/types/github.graphql.generated.ts'

export const findCommitsInComparison = async (
  params: FindCommitsInComparisonQueryVariables,
) => {
  const octokit = getOctokit()

  const data = await paginateGraphql(
    octokit.graphql,
    FindCommitsInComparisonDocument,
    params,
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
