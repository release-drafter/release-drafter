import { readFileSync } from 'node:fs'
import nock from 'nock'
import path from 'node:path'

type Query =
  | 'query findCommitsWithAssociatedPullRequests'
  | 'query findCommitsWithPathChangesQuery'

/**
 * Available files in fixtures/graphql
 */
type Payload =
  | 'graphql-commits-paginated-1'
  | 'graphql-commits-overlapping-label'
  | 'graphql-commits-no-prs'
  | 'graphql-commits-empty'
  | 'graphql-commits-merge-commit'
  | 'graphql-commits-rebase-merging'
  | 'graphql-include-path-src-5.md-forking'
  | 'graphql-commits-forking'
  | 'graphql-include-null-path-merge-commit'
  | 'graphql-include-path-src-5.md-rebase-merging'
  | 'graphql-include-null-path-overlapping-label'
  | 'graphql-commits-squash-merging'
  | 'graphql-include-null-path-forking'
  | 'graphql-include-null-path-rebase-merging'
  | 'graphql-include-null-path-squash-merging'
  | 'graphql-include-path-src-5.md-merge-commit'
  | 'graphql-include-path-src-5.md-overlapping-label'
  | 'graphql-commits-paginated-2'
  | 'graphql-include-path-src-5.md-squash-merging'

export const getGqlPayload = (payload: Payload) =>
  JSON.parse(
    readFileSync(
      path.join(
        path.dirname(import.meta.filename),
        '../fixtures/graphql',
        payload + '.json'
      ),
      { encoding: 'utf8' }
    )
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
      }>
) => {
  const paramsList = Array.isArray(params) ? params : [params]

  let scope = nock('https://api.github.com')

  for (const param of paramsList) {
    const payloads = Array.isArray(param.payload)
      ? param.payload
      : [param.payload]

    for (const payload of payloads) {
      scope = scope
        .post('/graphql', (body) =>
          body.query.includes(
            param.query || 'query findCommitsWithAssociatedPullRequests'
          )
        )
        .reply(200, getGqlPayload(payload))
    }
  }

  return scope
}
