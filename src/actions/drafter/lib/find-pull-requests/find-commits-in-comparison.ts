import {
  executeGraphql,
  type GitHubContext,
  getOctokit,
} from '#src/common/index.ts'
import { commitishToCommitExpression } from '#src/common/parse-commitish.ts'
import {
  FindCommitsInComparisonDocument,
  type FindCommitsInComparisonQuery,
  type FindCommitsInComparisonQueryVariables,
} from '#src/types/github.graphql.generated.ts'

type Params = Omit<
  FindCommitsInComparisonQueryVariables,
  'cursor' | 'useCommitishes'
> & {
  useCommitishes?: boolean
}
type Repository = NonNullable<FindCommitsInComparisonQuery['repository']>
type RefCommits = NonNullable<
  NonNullable<NonNullable<Repository['ref']>['compare']>['commits']['nodes']
>
type HeadCommit = Extract<
  NonNullable<Repository['head']>,
  { __typename: 'Commit' }
>
type HistoryCommits = NonNullable<HeadCommit['history']['nodes']>
type ComparisonCommit = NonNullable<RefCommits[number] | HistoryCommits[number]>

export const findCommitsInComparison = async (
  params: Params & { github?: Pick<GitHubContext, 'octokit'> },
) => {
  const { octokit } = params.github ?? { octokit: getOctokit() }
  const commits: ComparisonCommit[] = []
  const useCommitishes = params.useCommitishes ?? false
  const queryParams = {
    ...params,
    useCommitishes,
    baseCommitish: useCommitishes
      ? commitishToCommitExpression(params.baseCommitish)
      : params.baseCommitish,
    headCommitish: useCommitishes
      ? commitishToCommitExpression(params.headCommitish)
      : params.headCommitish,
  }
  let cursor: string | null | undefined

  while (true) {
    const data = await executeGraphql(
      octokit.graphql,
      FindCommitsInComparisonDocument,
      { ...queryParams, cursor },
    )
    const repository = data.repository

    if (useCommitishes) {
      const baseOid =
        repository?.base?.__typename === 'Commit'
          ? repository.base.oid
          : undefined
      const history =
        repository?.head?.__typename === 'Commit'
          ? repository.head.history
          : undefined

      if (!baseOid || !history) {
        throw new Error(
          'Base or head commitish could not be resolved to a commit',
        )
      }

      for (const commit of history.nodes ?? []) {
        if (!commit) continue
        if (commit.oid === baseOid) return commits
        commits.push(commit)
      }

      if (!history.pageInfo.hasNextPage) {
        throw new Error(
          `Base commitish ${params.baseCommitish} is not an ancestor of ${params.headCommitish}`,
        )
      }
      cursor = history.pageInfo.endCursor
    } else {
      const comparison = repository?.ref?.compare?.commits
      if (!comparison) {
        throw new Error(
          'Query returned an unexpected result: ref or comparison not found',
        )
      }

      commits.push(
        ...(comparison.nodes ?? []).filter((commit) => commit != null),
      )
      if (!comparison.pageInfo.hasNextPage) return commits
      cursor = comparison.pageInfo.endCursor
    }

    if (!cursor) {
      throw new Error('Commit comparison pagination returned no cursor')
    }
  }
}
