import { readFileSync } from 'node:fs'
import path from 'node:path'
import nock from 'nock'

type Query =
  | 'query findCommitsInComparison'
  | 'query findRecentMergedPullRequests'

/**
 * Available files in fixtures/graphql
 */
type Payload =
  | 'graphql-include-path-src-5.md-forking'
  | 'graphql-include-path-src-5.md-rebase-merging'
  | 'graphql-include-null-path-overlapping-label'
  | 'graphql-include-null-path-forking'
  | 'graphql-include-null-path-rebase-merging'
  | 'graphql-include-null-path-squash-merging'
  | 'graphql-include-path-src-5.md-overlapping-label'
  | 'graphql-include-path-src-5.md-squash-merging'
  | 'graphql-comparison-merge-commit'
  | 'graphql-comparison-no-prs'
  | 'graphql-comparison-empty'
  | 'graphql-comparison-overlapping-label'
  | 'graphql-comparison-forking'
  | 'graphql-comparison-rebase-merging'
  | 'graphql-comparison-squash-merging'
  | 'graphql-comparison-paginated-1'
  | 'graphql-comparison-paginated-2'
  | 'graphql-comparison-missing-pr'
  | 'graphql-comparison-missing-pr-with-paths'
  | 'graphql-recent-merged-prs'
  | 'graphql-recent-merged-prs-with-paths'

export const getGqlPayload = (payload: Payload) =>
  JSON.parse(
    readFileSync(
      path.join(
        path.dirname(import.meta.filename),
        '../fixtures/graphql',
        `${payload}.json`,
      ),
      { encoding: 'utf8' },
    ),
  )

const commitOid = (commit: { id?: string; oid?: string }) => {
  if (commit.oid) return commit.oid
  const decodedId = Buffer.from(commit.id || '', 'base64').toString('utf8')
  return decodedId.slice(decodedId.lastIndexOf(':') + 1)
}

export const mockGraphqlQuery = (
  params:
    | {
        query?: Query
        payload: Payload | Payload[]
        variables?: Record<string, unknown>
        suppressRecentPullRequestMock?: boolean
      }
    | Array<{
        query?: Query
        payload: Payload | Payload[]
        variables?: Record<string, unknown>
        suppressRecentPullRequestMock?: boolean
      }>,
) => {
  const paramsList = Array.isArray(params) ? params : [params]

  let scope = nock('https://api.github.com')
  const hasRecentPullRequestFixture = paramsList.some(
    (param) => param.query === 'query findRecentMergedPullRequests',
  )

  for (const param of paramsList) {
    const payloads = Array.isArray(param.payload)
      ? param.payload
      : [param.payload]

    const defaultQuery: Query = 'query findCommitsInComparison'

    if ((param.query || defaultQuery) === 'query findCommitsInComparison') {
      const comparisonPayloads = payloads.map(getGqlPayload)
      const commits = comparisonPayloads.flatMap((payload) =>
        payload.data.repository.ref.compare.commits.nodes
          .filter(Boolean)
          .map((commit: { id?: string; oid?: string }) => ({
            ...commit,
            oid: commitOid(commit),
          })),
      )

      scope = scope
        .get(/\/repos\/[^/]+\/[^/]+\/compare\//)
        .query(true)
        .reply(200, {
          commits: commits.map((commit) => ({ sha: commit.oid })),
        })

      if (commits.length === 0) continue

      for (const payload of comparisonPayloads) {
        const history = payload.data.repository.ref.compare.commits
        scope = scope
          .post(
            '/graphql',
            (body) =>
              body.query.includes('query hydrateComparisonCommits') &&
              Object.entries(param.variables || {}).every(
                ([key, value]) => body.variables[key] === value,
              ),
          )
          .reply(200, {
            data: {
              repository: {
                object: {
                  __typename: 'Commit',
                  history: {
                    ...history,
                    nodes: history.nodes
                      .filter(Boolean)
                      .map((commit: { id?: string; oid?: string }) => ({
                        ...commit,
                        oid: commitOid(commit),
                      })),
                  },
                },
              },
            },
          })
      }

      if (
        !hasRecentPullRequestFixture &&
        !param.suppressRecentPullRequestMock
      ) {
        scope = scope
          .post('/graphql', (body) =>
            body.query.includes('query findRecentMergedPullRequests'),
          )
          .reply(200, {
            data: {
              repository: {
                pullRequests: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [],
                },
              },
            },
          })
      }
      continue
    }

    for (const payload of payloads) {
      const response = getGqlPayload(payload)
      if (
        (param.query || defaultQuery) === 'query findRecentMergedPullRequests'
      ) {
        response.data.repository.pullRequests.pageInfo ??= {
          hasNextPage: false,
          endCursor: null,
        }
      }
      scope = scope
        .post('/graphql', (body) =>
          body.query.includes(param.query || defaultQuery),
        )
        .reply(200, response)
    }
  }

  return scope
}
