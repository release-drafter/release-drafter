import { readFileSync } from 'fs'
import nock from 'nock'
import path from 'path'

type Query =
  | 'query findCommitsWithAssociatedPullRequests'
  | 'query findCommitsWithPathChangesQuery'

/**
 * Available files in fixtures/graphql
 */
type Payload = 'graphql-commits-no-prs' | 'graphql-commits-merge-commit'

export const mockGraphqlQuery = (params: { query?: Query; payload: Payload }) =>
  nock('https://api.github.com')
    .post('/graphql', (body) =>
      body.query.includes(
        params.query || 'query findCommitsWithAssociatedPullRequests'
      )
    )
    .reply(
      200,
      readFileSync(
        path.join(
          path.dirname(import.meta.filename),
          '../fixtures/graphql',
          params.payload + '.json'
        ),
        { encoding: 'utf8' }
      )
    )
