import { readFileSync } from 'fs'
import nock from 'nock'
import path from 'path'

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

export const mockGraphqlQuery = (params: { query?: Query; payload: Payload }) =>
  nock('https://api.github.com')
    .post('/graphql', (body) =>
      body.query.includes(
        params.query || 'query findCommitsWithAssociatedPullRequests'
      )
    )
    .reply(
      200,
      JSON.parse(
        readFileSync(
          path.join(
            path.dirname(import.meta.filename),
            '../fixtures/graphql',
            params.payload + '.json'
          ),
          { encoding: 'utf8' }
        )
      )
    )
