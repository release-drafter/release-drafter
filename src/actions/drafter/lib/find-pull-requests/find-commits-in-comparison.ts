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

const findComparisonCommitOids = async (
  octokit: GitHubContext['octokit'],
  params: Pick<Params, 'owner' | 'name' | 'baseCommitish' | 'headCommitish'>,
) => {
  const commits: Array<{ sha: string }> = []
  let page = 1

  while (true) {
    const response = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: params.owner,
      repo: params.name,
      basehead: `${params.baseCommitish}...${params.headCommitish}`,
      per_page: 100,
      page,
    })
    commits.push(...response.data.commits)

    if (!response.headers.link?.includes('rel="next"')) break
    page++
  }

  return new Set(commits.map((commit) => commit.sha))
}

export const findCommitsInComparison = async (
  params: Params & { github?: Pick<GitHubContext, 'octokit'> },
) => {
  const { octokit } = params.github ?? { octokit: getOctokit() }
  const { github: _github, ...comparisonParams } = params
  const commits: ComparisonCommit[] = []
  const useCommitishes = params.useCommitishes ?? false
  const remainingComparisonOids = useCommitishes
    ? await findComparisonCommitOids(octokit, params)
    : undefined

  if (remainingComparisonOids?.size === 0) return commits

  const queryParams = {
    ...comparisonParams,
    useCommitishes,
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

    if (remainingComparisonOids) {
      const history =
        repository?.head?.__typename === 'Commit'
          ? repository.head.history
          : undefined

      if (!history) {
        throw new Error('Head commitish could not be resolved to a commit')
      }

      for (const commit of history.nodes ?? []) {
        if (commit && remainingComparisonOids.delete(commit.oid)) {
          commits.push(commit)
        }
      }

      if (remainingComparisonOids.size === 0) return commits
      if (!history.pageInfo.hasNextPage) {
        throw new Error(
          `Comparison commits were not found in the history of ${params.headCommitish}: ${[...remainingComparisonOids].join(', ')}`,
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
