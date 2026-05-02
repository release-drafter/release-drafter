import { readFileSync } from 'node:fs'
import path from 'node:path'
import nock from 'nock'

type Query =
  | 'query findCommitsWithPathChangesQuery'
  | 'query findCommitsInComparison'
  | 'query findRecentMergedPullRequests'

/**
 * Available files in fixtures/graphql
 */
type Payload =
  | 'graphql-include-path-src-5.md-forking'
  | 'graphql-include-null-path-merge-commit'
  | 'graphql-include-path-src-5.md-rebase-merging'
  | 'graphql-include-null-path-overlapping-label'
  | 'graphql-include-null-path-forking'
  | 'graphql-include-null-path-rebase-merging'
  | 'graphql-include-null-path-squash-merging'
  | 'graphql-include-path-src-5.md-merge-commit'
  | 'graphql-include-path-src-5.md-overlapping-label'
  | 'graphql-include-path-src-5.md-squash-merging'
  | 'graphql-exclude-path-merge-commit'
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
  | 'graphql-recent-merged-prs'

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

export const mockGraphqlQuery = (
  params:
    | {
        query?: Query
        payload: Payload | Payload[]
      }
    | Array<{
        query?: Query
        payload: Payload | Payload[]
      }>,
) => {
  const paramsList = Array.isArray(params) ? params : [params]

  let scope = nock('https://api.github.com')

  for (const param of paramsList) {
    const payloads = Array.isArray(param.payload)
      ? param.payload
      : [param.payload]

    const defaultQuery: Query = 'query findCommitsInComparison'

    for (const payload of payloads) {
      scope = scope
        .post('/graphql', (body) =>
          body.query.includes(param.query || defaultQuery),
        )
        .reply(200, getGqlPayload(payload))
    }
  }

  return scope
}
