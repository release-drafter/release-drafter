import {
  type GitHubContext,
  paginateGraphqlIterator,
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
type ComparisonPage = { commits: Array<{ sha: string }> }

/**
 * Resolves the exact `base...head` commit set. This is the only GitHub API that
 * applies merge-base comparison semantics to *arbitrary* commitishes; GraphQL's
 * `Ref.compare` needs a qualified ref name and cannot walk an annotated tag or a
 * bare SHA. The oids only select commits out of the GraphQL history below, which
 * is what supplies the pull request and author fields REST lacks.
 */
const findComparisonCommitOids = async (
  octokit: GitHubContext['octokit'],
  params: Pick<Params, 'owner' | 'name' | 'baseCommitish' | 'headCommitish'>,
) => {
  const commits = await octokit.paginate(
    octokit.rest.repos.compareCommitsWithBasehead,
    {
      owner: params.owner,
      repo: params.name,
      basehead: `${params.baseCommitish}...${params.headCommitish}`,
      per_page: 100,
    },
    // Octokit types comparison pages as though the plugin reshaped them into a
    // bare commit list, but it skips that normalization for this route because
    // the payload carries a `url` key, so each page is still the whole
    // comparison object. The cast follows the runtime rather than the types.
    (response) => (response.data as unknown as ComparisonPage).commits,
  )

  return new Set(commits.map((commit) => commit.sha))
}

export const findCommitsInComparison = async (
  params: Params & { github: Pick<GitHubContext, 'octokit'> },
) => {
  const { octokit } = params.github
  const { github: _github, ...comparisonParams } = params
  const commits: ComparisonCommit[] = []
  const useCommitishes = params.useCommitishes ?? false
  const remainingComparisonOids = useCommitishes
    ? await findComparisonCommitOids(octokit, params)
    : undefined

  if (remainingComparisonOids?.size === 0) return commits

  // `@skip`/`@include` leaves exactly one paginated connection in the response,
  // so the plugin locates whichever of `ref.compare.commits` or `head.history`
  // is present and drives the cursor for it.
  const pages = paginateGraphqlIterator(
    octokit.graphql,
    FindCommitsInComparisonDocument,
    {
      ...comparisonParams,
      useCommitishes,
      headCommitish: useCommitishes
        ? commitishToCommitExpression(params.headCommitish)
        : params.headCommitish,
    },
  )

  for await (const data of pages) {
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

      // Stop as soon as the comparison set is hydrated rather than walking the
      // rest of the branch history.
      if (remainingComparisonOids.size === 0) return commits
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
    }
  }

  if (remainingComparisonOids?.size) {
    throw new Error(
      `Comparison commits were not found in the history of ${params.headCommitish}: ${[...remainingComparisonOids].join(', ')}`,
    )
  }

  return commits
}
