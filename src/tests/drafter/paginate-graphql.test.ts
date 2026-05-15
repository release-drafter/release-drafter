import type { graphql } from '@octokit/graphql'
import type { RequestParameters } from '@octokit/graphql/types'
import { describe, expect, it, vi } from 'vitest'
import { paginateGraphql } from '#src/common/paginate-graphql.ts'

type GraphQLClient = typeof graphql

describe('paginateGraphql', () => {
  describe('single page results', () => {
    it('should return data when there is no next page', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [{ id: '1' }, { id: '2' }],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor1',
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql(
        mockClient as unknown as GraphQLClient,
        query,
        variables,
        paginatePath,
      )

      expect(mockClient).toHaveBeenCalledTimes(1)
      expect(mockClient).toHaveBeenCalledWith(query, variables)
      expect(result).toEqual({
        repository: {
          pullRequests: {
            nodes: [{ id: '1' }, { id: '2' }],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor1',
            },
          },
        },
      })
    })

    it('should handle empty nodes array', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          issues: {
            nodes: [],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      })

      const query = `query { repository { issues { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'issues']

      const result = await paginateGraphql<{
        repository: {
          issues: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.repository.issues.nodes).toEqual([])
      expect(mockClient).toHaveBeenCalledTimes(1)
    })
  })

  describe('multiple page results', () => {
    it('should paginate through all pages and accumulate nodes', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }, { id: '2' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '3' }, { id: '4' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor2',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '5' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor3',
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql<{
        repository: {
          pullRequests: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(mockClient).toHaveBeenCalledTimes(3)
      expect(mockClient).toHaveBeenNthCalledWith(1, query, variables)
      expect(mockClient).toHaveBeenNthCalledWith(2, query, {
        ...variables,
        after: 'cursor1',
      })
      expect(mockClient).toHaveBeenNthCalledWith(3, query, {
        ...variables,
        after: 'cursor2',
      })
      expect(result.repository.pullRequests.nodes).toEqual([
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
        { id: '5' },
      ])
      expect(result.repository.pullRequests.pageInfo).toEqual({
        hasNextPage: false,
        endCursor: 'cursor3',
      })
    })

    it('should handle many pages of results', async () => {
      const mockClient = vi.fn()
      const totalPages = 10
      const itemsPerPage = 5

      for (let i = 0; i < totalPages; i++) {
        const nodes = Array.from({ length: itemsPerPage }, (_, j) => ({
          id: `${i * itemsPerPage + j + 1}`,
        }))
        mockClient.mockResolvedValueOnce({
          search: {
            nodes,
            pageInfo: {
              hasNextPage: i < totalPages - 1,
              endCursor: `cursor${i + 1}`,
            },
          },
        })
      }

      const query = `query { search { nodes { id } pageInfo { hasNextPage endCursor } } }`
      const variables: RequestParameters = { query: 'is:pr' }
      const paginatePath = ['search']

      const result = await paginateGraphql<{
        search: {
          nodes: unknown[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(mockClient).toHaveBeenCalledTimes(totalPages)
      expect(result.search.nodes).toHaveLength(totalPages * itemsPerPage)
      expect(result.search.nodes[0]).toEqual({ id: '1' })
      expect(result.search.nodes[totalPages * itemsPerPage - 1]).toEqual({
        id: `${totalPages * itemsPerPage}`,
      })
    })
  })

  describe('nested pagination paths', () => {
    it('should handle deeply nested pagination path', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        viewer: {
          organization: {
            repository: {
              pullRequests: {
                nodes: [{ id: '1' }],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: 'cursor1',
                },
              },
            },
          },
        },
      })

      const query = `query { viewer { organization { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } } } }`
      const variables: RequestParameters = {}
      const paginatePath = [
        'viewer',
        'organization',
        'repository',
        'pullRequests',
      ]

      const result = await paginateGraphql<{
        viewer: {
          organization: {
            repository: {
              pullRequests: {
                nodes: unknown[]
                pageInfo: { hasNextPage: boolean; endCursor: string | null }
              }
            }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.viewer.organization.repository.pullRequests.nodes).toEqual([
        { id: '1' },
      ])
    })

    it('should handle root-level pagination', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        items: {
          nodes: [{ id: '1' }, { id: '2' }],
          pageInfo: {
            hasNextPage: false,
            endCursor: 'cursor1',
          },
        },
      })

      const query = `query { items { nodes { id } pageInfo { hasNextPage endCursor } } }`
      const variables: RequestParameters = {}
      const paginatePath = ['items']

      const result = await paginateGraphql<{
        items: {
          nodes: unknown[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.items.nodes).toEqual([{ id: '1' }, { id: '2' }])
    })
  })

  describe('error handling', () => {
    it('should throw error when nodes field is missing', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            // nodes field is missing
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor1',
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      await expect(
        paginateGraphql(
          mockClient as unknown as GraphQLClient,
          query,
          variables,
          paginatePath,
        ),
      ).rejects.toThrowError(
        "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field.",
      )
    })

    it('should throw error when pageInfo field is missing', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [{ id: '1' }],
            // pageInfo field is missing
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      await expect(
        paginateGraphql(
          mockClient as unknown as GraphQLClient,
          query,
          variables,
          paginatePath,
        ),
      ).rejects.toThrowError(
        "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field.",
      )
    })

    it('should throw error when endCursor field is missing', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [{ id: '1' }],
            pageInfo: {
              hasNextPage: false,
              // endCursor is missing
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      await expect(
        paginateGraphql(
          mockClient as unknown as GraphQLClient,
          query,
          variables,
          paginatePath,
        ),
      ).rejects.toThrowError(
        "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field.",
      )
    })

    it('should throw error when hasNextPage field is missing', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [{ id: '1' }],
            pageInfo: {
              endCursor: 'cursor1',
              // hasNextPage is missing
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      await expect(
        paginateGraphql(
          mockClient as unknown as GraphQLClient,
          query,
          variables,
          paginatePath,
        ),
      ).rejects.toThrowError(
        "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field.",
      )
    })

    it('should throw error with incorrect paginatePath', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [{ id: '1' }],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor1',
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'issues'] // Wrong path

      await expect(
        paginateGraphql(
          mockClient as unknown as GraphQLClient,
          query,
          variables,
          paginatePath,
        ),
      ).rejects.toThrowError(
        "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field.",
      )
    })
  })

  describe('cursor and variable handling', () => {
    it('should preserve and pass through other request parameters', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '2' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor2',
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = {
        owner: 'test',
        repo: 'test',
        states: ['OPEN'],
        labels: ['bug'],
      }
      const paginatePath = ['repository', 'pullRequests']

      await paginateGraphql(
        mockClient as unknown as GraphQLClient,
        query,
        variables,
        paginatePath,
      )

      expect(mockClient).toHaveBeenNthCalledWith(1, query, {
        owner: 'test',
        repo: 'test',
        states: ['OPEN'],
        labels: ['bug'],
      })
      expect(mockClient).toHaveBeenNthCalledWith(2, query, {
        owner: 'test',
        repo: 'test',
        states: ['OPEN'],
        labels: ['bug'],
        after: 'cursor1',
      })
    })

    it('should handle null endCursor on final page', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '2' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql<{
        repository: {
          pullRequests: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.repository.pullRequests.pageInfo.endCursor).toBeNull()
      expect(result.repository.pullRequests.nodes).toHaveLength(2)
    })

    it('should handle existing after parameter in variables', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '2' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor2',
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = {
        owner: 'test',
        repo: 'test',
        after: 'existingCursor',
      }
      const paginatePath = ['repository', 'pullRequests']

      await paginateGraphql(
        mockClient as unknown as GraphQLClient,
        query,
        variables,
        paginatePath,
      )

      // First call should use the provided after parameter
      expect(mockClient).toHaveBeenNthCalledWith(1, query, {
        owner: 'test',
        repo: 'test',
        after: 'existingCursor',
      })
      // Second call should override with the new cursor
      expect(mockClient).toHaveBeenNthCalledWith(2, query, {
        owner: 'test',
        repo: 'test',
        after: 'cursor1',
      })
    })
  })

  describe('complex data structures', () => {
    it('should handle nodes with complex nested objects', async () => {
      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [
              {
                id: '1',
                title: 'PR 1',
                author: { login: 'user1', id: '100' },
                labels: { nodes: [{ name: 'bug' }] },
              },
              {
                id: '2',
                title: 'PR 2',
                author: { login: 'user2', id: '101' },
                labels: { nodes: [{ name: 'feature' }] },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor1',
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id title author { login id } labels { nodes { name } } } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql<{
        repository: {
          pullRequests: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.repository.pullRequests.nodes).toEqual([
        {
          id: '1',
          title: 'PR 1',
          author: { login: 'user1', id: '100' },
          labels: { nodes: [{ name: 'bug' }] },
        },
        {
          id: '2',
          title: 'PR 2',
          author: { login: 'user2', id: '101' },
          labels: { nodes: [{ name: 'feature' }] },
        },
      ])
    })

    it('should merge nodes correctly with complex objects across pages', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          search: {
            nodes: [
              { id: '1', data: { value: 'a' } },
              { id: '2', data: { value: 'b' } },
            ],
            pageInfo: {
              hasNextPage: true,
              endCursor: 'cursor1',
            },
          },
        })
        .mockResolvedValueOnce({
          search: {
            nodes: [
              { id: '3', data: { value: 'c' } },
              { id: '4', data: { value: 'd' } },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor2',
            },
          },
        })

      const query = `query { search { nodes { id data { value } } pageInfo { hasNextPage endCursor } } }`
      const variables: RequestParameters = { query: 'test' }
      const paginatePath = ['search']

      const result = await paginateGraphql<{
        search: {
          nodes: unknown[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.search.nodes).toEqual([
        { id: '1', data: { value: 'a' } },
        { id: '2', data: { value: 'b' } },
        { id: '3', data: { value: 'c' } },
        { id: '4', data: { value: 'd' } },
      ])
    })
  })

  describe('edge cases', () => {
    it('should handle pages with single node', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '2' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor2',
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql<{
        repository: {
          pullRequests: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.repository.pullRequests.nodes).toEqual([
        { id: '1' },
        { id: '2' },
      ])
    })

    it('should handle page with empty nodes followed by page with nodes', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor2',
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql<{
        repository: {
          pullRequests: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.repository.pullRequests.nodes).toEqual([{ id: '1' }])
    })

    it('should maintain order of nodes across pages', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            issues: {
              nodes: [{ number: 3 }, { number: 2 }, { number: 1 }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            issues: {
              nodes: [{ number: 6 }, { number: 5 }, { number: 4 }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor2',
              },
            },
          },
        })

      const query = `query { repository { issues { nodes { number } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'issues']

      const result = await paginateGraphql<{
        repository: {
          issues: {
            nodes: unknown[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, variables, paginatePath)

      expect(result.repository.issues.nodes).toEqual([
        { number: 3 },
        { number: 2 },
        { number: 1 },
        { number: 6 },
        { number: 5 },
        { number: 4 },
      ])
    })

    it('should not modify original request parameters', async () => {
      const mockClient = vi
        .fn()
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '1' }],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor1',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: {
              nodes: [{ id: '2' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor2',
              },
            },
          },
        })

      const query = `query { repository { pullRequests { nodes { id } pageInfo { hasNextPage endCursor } } } }`
      const originalVariables: RequestParameters = {
        owner: 'test',
        repo: 'test',
      }
      const paginatePath = ['repository', 'pullRequests']

      await paginateGraphql(
        mockClient as unknown as GraphQLClient,
        query,
        originalVariables,
        paginatePath,
      )

      // Original variables should not be modified
      expect(originalVariables).toEqual({ owner: 'test', repo: 'test' })
      expect(originalVariables).not.toHaveProperty('after')
    })
  })

  describe('TypeScript type safety', () => {
    it('should work with typed GraphQL response', async () => {
      interface PullRequest {
        id: string
        title: string
      }

      interface GraphQLResponse {
        repository: {
          pullRequests: {
            nodes: PullRequest[]
            pageInfo: {
              hasNextPage: boolean
              endCursor: string | null
            }
          }
        }
      }

      const mockClient = vi.fn().mockResolvedValueOnce({
        repository: {
          pullRequests: {
            nodes: [
              { id: '1', title: 'Test PR 1' },
              { id: '2', title: 'Test PR 2' },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor1',
            },
          },
        },
      })

      const query = `query { repository { pullRequests { nodes { id title } pageInfo { hasNextPage endCursor } } } }`
      const variables: RequestParameters = { owner: 'test', repo: 'test' }
      const paginatePath = ['repository', 'pullRequests']

      const result = await paginateGraphql<GraphQLResponse>(
        mockClient as unknown as GraphQLClient,
        query,
        variables,
        paginatePath,
      )

      // Type checking ensures these properties exist
      expect(result.repository.pullRequests.nodes[0].id).toBe('1')
      expect(result.repository.pullRequests.nodes[0].title).toBe('Test PR 1')
    })
  })

  describe('original test cases from JavaScript version', () => {
    it('concats pagination results', async () => {
      const mockClient = vi.fn()
      // query is empty because we mock the result
      const query = ``

      mockClient
        .mockResolvedValueOnce({
          repository: {
            object: {
              history: {
                nodes: ['a', 'b', 'c'],
                pageInfo: {
                  endCursor: 'aaa',
                  hasNextPage: true,
                },
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            object: {
              history: {
                nodes: ['d', 'e', 'f'],
                pageInfo: {
                  endCursor: 'bbb',
                  hasNextPage: false,
                },
              },
            },
          },
        })

      const data = await paginateGraphql<{
        repository: {
          object: {
            history: {
              nodes: string[]
              pageInfo: { endCursor: string; hasNextPage: boolean }
            }
          }
        }
      }>(mockClient as unknown as GraphQLClient, query, {}, [
        'repository',
        'object',
        'history',
      ])

      expect(mockClient).toHaveBeenCalledTimes(2)
      expect(data.repository.object.history.nodes).toEqual([
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
      ])
      expect(data.repository.object.history.pageInfo).toEqual({
        endCursor: 'bbb',
        hasNextPage: false,
      })
    })

    it("throws when query doesn't return `nodes` or `pageInfo` fields", async () => {
      const mockClient = vi.fn()
      // query is empty because we mock the result
      const query = ``

      mockClient.mockResolvedValueOnce({})

      await expect(
        paginateGraphql(mockClient as unknown as GraphQLClient, query, {}, []),
      ).rejects.toThrow()
    })
  })
})
