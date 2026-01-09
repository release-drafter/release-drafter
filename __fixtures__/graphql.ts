import { readFileSync } from 'fs'
import nock from 'nock'
import path from 'path'

type Query =
  | 'query findCommitsWithAssociatedPullRequests'
  | 'query findCommitsWithPathChangesQuery'

type Payload = 'graphql-commits-no-prs.json'

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
          'graphql',
          params.payload
        ),
        { encoding: 'utf8' }
      )
    )
