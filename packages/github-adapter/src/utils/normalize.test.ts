import { describe, expect, it } from 'vitest'
import type { GraphCommit, GraphPullRequest } from '../types/github.ts'
import { normalizeCommit, normalizePullRequest } from './normalize.ts'

describe('incomplete GitHub GraphQL responses', () => {
  it.each([undefined, null, {}, { nodes: null }])(
    'normalizes absent label connections without inventing labels: %j',
    (labels) => {
      const result = normalizePullRequest({
        number: 1,
        title: 'Change',
        author: null,
        baseRepository: null,
        labels,
      })
      expect(result).toMatchObject({
        number: 1,
        title: 'Change',
        author: null,
        baseRepository: null,
        labels: [],
      })
    },
  )

  it('discards null or unnamed labels while preserving named labels', () => {
    const input: GraphPullRequest = {
      number: 1,
      title: 'Change',
      labels: {
        nodes: [null, {}, { name: '' }, { name: null }, { name: 'feature' }],
      },
    }
    expect(normalizePullRequest(input).labels).toEqual(['feature'])
    expect(input.labels?.nodes).toHaveLength(5)
  })

  it.each([undefined, null])(
    'preserves unavailable author and association connections: %s',
    (connection) => {
      const result = normalizeCommit({
        oid: 'sha',
        author: connection,
        authors: connection,
        associatedPullRequests: connection,
      })
      expect(result).toMatchObject({
        oid: 'sha',
        author: connection,
        authors: connection,
        associatedPullRequests: connection,
      })
    },
  )

  it.each([{}, { nodes: null }])(
    'normalizes present connections with absent nodes to empty lists: %j',
    (connection) => {
      const result = normalizeCommit({
        oid: 'sha',
        authors: connection,
        associatedPullRequests: connection,
      })
      expect(result.authors).toEqual([])
      expect(result.associatedPullRequests).toEqual([])
    },
  )

  it('preserves commit attribution when an author or associated repository is unavailable', () => {
    const input: GraphCommit = {
      oid: 'sha',
      author: { name: 'Person', user: null },
      authors: {
        nodes: [
          null,
          { name: 'Coauthor', user: null },
          { user: { login: 'known' } },
        ],
      },
      associatedPullRequests: {
        nodes: [null, { number: 1, title: 'Change', baseRepository: null }],
      },
    }
    const result = normalizeCommit(input)
    expect(result.author).toEqual({
      name: 'Person',
      login: undefined,
      type: 'User',
    })
    expect(result.authors).toEqual([
      null,
      { name: 'Coauthor', login: undefined, type: 'User' },
      { name: undefined, login: 'known', type: 'User' },
    ])
    expect(result.associatedPullRequests).toEqual([
      null,
      { number: 1, baseRepository: null },
    ])
    expect(input.associatedPullRequests?.nodes?.[1]?.title).toBe('Change')
  })
})
