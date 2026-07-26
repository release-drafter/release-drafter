import type { graphql } from '@octokit/graphql'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { describe, expect, it, vi } from 'vitest'
import type { Octokit } from '#src/common/get-octokit.ts'
import { paginateGraphql } from '#src/common/graphql.ts'
import { TypedDocumentString } from '#src/types/github.graphql.generated.ts'

type Query = {
  repository: {
    issues: {
      nodes: { title: string }[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }
}

type Variables = { owner: string; cursor?: string | null }

const document = new TypedDocumentString<Query, Variables>(
  `query Issues($owner: String!, $cursor: String) {
    repository(owner: $owner, name: "example") {
      issues(first: 1, after: $cursor) {
        nodes { title }
        pageInfo { hasNextPage endCursor }
      }
    }
  }`,
)

const paginatingClient = (graphqlMock: ReturnType<typeof vi.fn>) =>
  paginateGraphQL({
    graphql: graphqlMock as unknown as typeof graphql,
  } as Octokit).graphql

describe('paginateGraphql', () => {
  it('merges multiple pages and advances the cursor', async () => {
    const graphqlMock = vi
      .fn()
      .mockResolvedValueOnce({
        repository: {
          issues: {
            nodes: [{ title: 'first' }],
            pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          issues: {
            nodes: [{ title: 'second' }],
            pageInfo: { hasNextPage: false, endCursor: 'cursor-2' },
          },
        },
      })

    const result = await paginateGraphql(
      paginatingClient(graphqlMock),
      document,
      {
        owner: 'release-drafter',
      },
    )

    expect(result.repository.issues.nodes).toEqual([
      { title: 'first' },
      { title: 'second' },
    ])
    expect(graphqlMock).toHaveBeenNthCalledWith(1, document.toString(), {
      owner: 'release-drafter',
    })
    expect(graphqlMock).toHaveBeenNthCalledWith(2, document.toString(), {
      owner: 'release-drafter',
      cursor: 'cursor-1',
    })
  })

  it('propagates GraphQL request errors', async () => {
    const error = new Error('request failed')
    const graphqlMock = vi.fn().mockRejectedValue(error)

    await expect(
      paginateGraphql(paginatingClient(graphqlMock), document, {
        owner: 'release-drafter',
      }),
    ).rejects.toBe(error)
  })

  it('rejects responses without pageInfo', async () => {
    const graphqlMock = vi.fn().mockResolvedValue({
      repository: { issues: { nodes: [{ title: 'first' }] } },
    })

    await expect(
      paginateGraphql(paginatingClient(graphqlMock), document, {
        owner: 'release-drafter',
      }),
    ).rejects.toThrow('No pageInfo property found in response')
  })

  it('rejects a cursor that does not advance', async () => {
    const graphqlMock = vi.fn().mockResolvedValue({
      repository: {
        issues: {
          nodes: [{ title: 'first' }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        },
      },
    })

    await expect(
      paginateGraphql(paginatingClient(graphqlMock), document, {
        owner: 'release-drafter',
        cursor: 'cursor-1',
      }),
    ).rejects.toThrow('did not change its value "cursor-1"')
  })
})
