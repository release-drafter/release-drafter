// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import type { Repository } from '@release-drafter/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubAdapter, type GitHubOctokit } from './index.ts'

const undiciMocks = vi.hoisted(() => {
  class MockEnvHttpProxyAgent {}
  return {
    MockEnvHttpProxyAgent,
    fetch: vi.fn(),
    EnvHttpProxyAgent: vi.fn(MockEnvHttpProxyAgent),
  }
})

vi.mock('undici', () => ({
  EnvHttpProxyAgent: undiciMocks.EnvHttpProxyAgent,
  fetch: undiciMocks.fetch,
}))

beforeEach(() => {
  undiciMocks.EnvHttpProxyAgent.mockImplementation(
    undiciMocks.MockEnvHttpProxyAgent,
  )
  undiciMocks.fetch.mockReset()
})

const repository: Repository = {
  owner: 'release-drafter',
  name: 'release-drafter',
  serverUrl: 'https://github.com',
}

const mockOctokit = (overrides: Record<string, unknown> = {}) =>
  ({
    rest: {
      repos: {
        listReleases: vi.fn(),
        compareCommitsWithBasehead: vi.fn(),
        createRelease: vi.fn(),
        updateRelease: vi.fn(),
        getContent: vi.fn(),
      },
      pulls: { listFiles: vi.fn() },
    },
    paginate: Object.assign(vi.fn(), { iterator: vi.fn() }),
    graphql: vi.fn(),
    ...overrides,
  }) as unknown as GitHubOctokit

const adapter = (octokit: GitHubOctokit) =>
  new GitHubAdapter({ token: 'token', octokit })

describe('GitHubAdapter', () => {
  it('requires authentication and derives GitHub.com and GHES endpoints', () => {
    expect(() => new GitHubAdapter({ token: '' })).toThrow(
      'GitHub authentication token is required',
    )
    const github = new GitHubAdapter({ token: 'token', fetch: vi.fn() })
    expect(github.apiUrl).toBe('https://api.github.com')
    expect(github.graphqlUrl).toBe('https://api.github.com/graphql')

    const ghes = new GitHubAdapter({
      token: 'token',
      serverUrl: 'https://github.example.com/',
      graphqlUrl: 'https://graphql.example.com/custom',
      fetch: vi.fn(),
    })
    expect(ghes.apiUrl).toBe('https://github.example.com/api/v3')
    expect(ghes.graphqlUrl).toBe('https://graphql.example.com/custom')
  })

  it('retries transient server failures but not exempt 404 responses', async () => {
    const transientFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('temporary', { status: 500 }))
      .mockResolvedValueOnce(Response.json({ id: 1, name: 'release-drafter' }))
    const transient = new GitHubAdapter({
      token: 'token',
      fetch: transientFetch,
    })

    await expect(
      transient.octokit.request('GET /repos/{owner}/{repo}', {
        owner: 'release-drafter',
        repo: 'release-drafter',
      }),
    ).resolves.toMatchObject({ status: 200 })
    expect(transientFetch).toHaveBeenCalledTimes(2)

    const missingFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('missing', { status: 404 }))
    const missing = new GitHubAdapter({ token: 'token', fetch: missingFetch })
    await expect(
      missing.octokit.request('GET /repos/{owner}/{repo}', {
        owner: 'release-drafter',
        repo: 'missing',
      }),
    ).rejects.toMatchObject({ status: 404 })
    expect(missingFetch).toHaveBeenCalledTimes(1)
  })

  it('does not retry transient failures when request retries are zero', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('temporary', { status: 500 }))
    const github = new GitHubAdapter({
      token: 'token',
      fetch,
      requestRetries: 0,
    })

    await expect(
      github.octokit.request('GET /repos/{owner}/{repo}', {
        owner: 'release-drafter',
        repo: 'release-drafter',
      }),
    ).rejects.toMatchObject({ status: 500 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('uses the production proxy-aware fetch with proxy and no_proxy settings', async () => {
    undiciMocks.fetch.mockResolvedValueOnce(
      Response.json({ id: 1, name: 'release-drafter' }),
    )
    const github = new GitHubAdapter({
      token: 'token',
      env: {
        HTTPS_PROXY: 'http://proxy.example.com:8080',
        NO_PROXY: 'api.github.com,localhost',
      },
    })
    const dispatcher = undiciMocks.EnvHttpProxyAgent.mock.results.at(-1)?.value
    await github.octokit.request('GET /repos/{owner}/{repo}', {
      owner: 'release-drafter',
      repo: 'release-drafter',
    })

    expect(undiciMocks.EnvHttpProxyAgent).toHaveBeenCalledWith({
      httpProxy: undefined,
      httpsProxy: 'http://proxy.example.com:8080',
      noProxy: 'api.github.com,localhost',
    })
    expect(undiciMocks.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dispatcher }),
    )
  })

  it('short-circuits an empty REST comparison before GraphQL or fan-out', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.paginate.iterator).mockReturnValue(
      (async function* () {
        yield { data: { commits: [] } }
      })() as never,
    )

    const result = await adapter(octokit).findChanges({
      repository,
      comparison: { baseRef: 'v1', headRef: 'main' },
      pullRequestFields: {
        body: false,
        url: false,
        baseRefName: false,
        headRefName: false,
      },
      pullRequestLimit: 20,
      historyLimit: 100,
      includeChangedFiles: true,
      includeNewContributors: true,
    })

    expect(result).toEqual({
      commits: [],
      pullRequests: [],
      newContributorLogins: new Set(),
    })
    expect(octokit.graphql).not.toHaveBeenCalled()
    expect(octokit.paginate).not.toHaveBeenCalled()
  })

  it('preserves REST comparison order across paginated GraphQL hydration', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.paginate.iterator).mockReturnValue(
      (async function* () {
        yield { data: { commits: [{ sha: 'b' }, { sha: 'a' }] } }
      })() as never,
    )
    vi.mocked(octokit.graphql)
      .mockResolvedValueOnce({
        repository: {
          object: {
            __typename: 'Commit',
            history: {
              pageInfo: { hasNextPage: true, endCursor: 'next' },
              nodes: [{ oid: 'a', associatedPullRequests: { nodes: [] } }],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          object: {
            __typename: 'Commit',
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ oid: 'b', associatedPullRequests: { nodes: [] } }],
            },
          },
        },
      })

    const result = await adapter(octokit).findChanges({
      repository,
      comparison: { baseRef: 'arbitrary-sha', headRef: 'refs/tags/v2' },
      pullRequestFields: {
        body: false,
        url: false,
        baseRefName: false,
        headRefName: false,
      },
      pullRequestLimit: 20,
      historyLimit: 1,
      includeChangedFiles: false,
      includeNewContributors: false,
    })

    expect(result.commits.map((commit) => commit.oid)).toEqual(['b', 'a'])
    expect(octokit.graphql).toHaveBeenCalledTimes(2)
    expect(octokit.graphql).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('hydrateComparisonCommits'),
      expect.objectContaining({ headRef: 'refs/tags/v2^{commit}' }),
    )
  })

  it('recovers a matching recent pull request from the second page', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.paginate.iterator).mockReturnValue(
      (async function* () {
        yield { data: { commits: [{ sha: 'matching-oid' }] } }
      })() as never,
    )
    const pullRequest = (number: number, oid: string) => ({
      number,
      title: `Pull request ${number}`,
      merged: true,
      baseRepository: {
        nameWithOwner: `${repository.owner}/${repository.name}`,
      },
      mergeCommit: { oid },
    })
    vi.mocked(octokit.graphql)
      .mockResolvedValueOnce({
        repository: {
          object: {
            __typename: 'Commit',
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  oid: 'matching-oid',
                  associatedPullRequests: { nodes: [] },
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: true, endCursor: 'recent-next' },
            nodes: [pullRequest(2, 'unrelated-oid')],
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [pullRequest(1, 'matching-oid')],
          },
        },
      })

    const result = await adapter(octokit).findChanges({
      repository,
      comparison: { baseRef: 'base', headRef: 'main' },
      pullRequestFields: {
        body: false,
        url: false,
        baseRefName: false,
        headRefName: false,
      },
      pullRequestLimit: 20,
      historyLimit: 100,
      includeChangedFiles: false,
      includeNewContributors: false,
    })

    expect(result.pullRequests.map(({ number }) => number)).toEqual([1])
    expect(octokit.graphql).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('findRecentMergedPullRequests'),
      expect.objectContaining({ cursor: 'recent-next', limit: 100 }),
    )
  })

  it('paginates changed files through GraphQL without REST file calls', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.paginate.iterator).mockReturnValue(
      (async function* () {
        yield { data: { commits: [{ sha: 'commit' }] } }
      })() as never,
    )
    const pullRequest = {
      number: 7,
      title: 'Change files',
      merged: true,
      baseRepository: {
        nameWithOwner: `${repository.owner}/${repository.name}`,
      },
      associatedPullRequests: undefined,
    }
    vi.mocked(octokit.graphql)
      .mockResolvedValueOnce({
        repository: {
          object: {
            __typename: 'Commit',
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  oid: 'commit',
                  associatedPullRequests: { nodes: [pullRequest] },
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            files: {
              pageInfo: { hasNextPage: true, endCursor: 'next' },
              nodes: [{ path: 'a.ts' }],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            files: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ path: 'b.ts' }],
            },
          },
        },
      })

    const result = await adapter(octokit).findChanges({
      repository,
      comparison: { baseRef: 'base', headRef: 'main' },
      pullRequestFields: {
        body: false,
        url: false,
        baseRefName: false,
        headRefName: false,
      },
      pullRequestLimit: 20,
      historyLimit: 100,
      includeChangedFiles: true,
      includeNewContributors: false,
    })

    expect(result.pullRequests[0]?.changedFiles).toEqual(['a.ts', 'b.ts'])
    expect(octokit.rest.pulls.listFiles).not.toHaveBeenCalled()
    expect(octokit.graphql).toHaveBeenCalledWith(
      expect.stringContaining('findPullRequestChangedFiles'),
      expect.objectContaining({ cursor: 'next', number: 7 }),
    )
  })

  it('rejects changed-file pagination without a required end cursor', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.graphql).mockResolvedValueOnce({
      repository: {
        pullRequest: {
          files: {
            pageInfo: { hasNextPage: true, endCursor: null },
            nodes: [{ path: 'partial.ts' }],
          },
        },
      },
    })

    await expect(
      adapter(octokit).findPullRequestChangedFiles({
        repository,
        number: 7,
      }),
    ).rejects.toThrow(
      'Query returned no end cursor for the next pull request file page',
    )
    expect(octokit.graphql).toHaveBeenCalledTimes(1)
  })

  it('stops release pagination at the 1000 release safety cap', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.paginate).mockImplementation((async (
      ...args: unknown[]
    ) => {
      const map = args[2] as (
        response: { data: Array<{ id: number; tag_name: string }> },
        done: () => void,
      ) => Array<{ id: number; tag_name: string }>
      const releases: unknown[] = []
      let stopped = false
      for (let page = 0; page < 11 && !stopped; page++) {
        releases.push(
          ...map(
            {
              data: Array.from({ length: 100 }, (_, index) => ({
                id: page * 100 + index,
                tag_name: `v${page}-${index}`,
              })),
            } as never,
            () => {
              stopped = true
            },
          ),
        )
      }
      return releases as never
    }) as never)
    const releases = await adapter(octokit).listReleases({ repository })
    expect(releases).toHaveLength(1000)
    expect(releases.at(-1)?.tagName).toBe('v9-99')
  })

  it('preserves legacy create release fields and normalizes the response', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.createRelease).mockResolvedValue({
      data: {
        id: 42,
        tag_name: 'v2',
        name: null,
        target_commitish: 'main',
        html_url: 'https://github.com/o/r/releases/42',
        upload_url: 'https://uploads.github.com/42',
      },
    } as never)
    const release = await adapter(octokit).createRelease({
      repository,
      payload: {
        name: '',
        tag: 'v2',
        body: 'notes',
        targetCommitish: '',
        prerelease: true,
        makeLatest: true,
        draft: false,
      },
    })
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledWith({
      owner: repository.owner,
      repo: repository.name,
      name: '',
      tag_name: 'v2',
      target_commitish: '',
      body: 'notes',
      draft: false,
      prerelease: true,
      make_latest: 'false',
    })
    expect(release).toMatchObject({
      id: 42,
      tagName: 'v2',
      url: 'https://github.com/o/r/releases/42',
      uploadUrl: 'https://uploads.github.com/42',
    })
  })

  it('falls back on update release fields and omits an empty target', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.updateRelease).mockResolvedValue({
      data: {
        id: 43,
        tag_name: 'v2',
        name: 'Existing release',
        target_commitish: 'main',
        html_url: 'https://github.com/o/r/releases/43',
        upload_url: 'https://uploads.github.com/43',
      },
    } as never)

    const release = await adapter(octokit).updateRelease({
      repository,
      release: {
        id: '43',
        tagName: 'v2',
        name: 'Existing release',
      },
      payload: {
        name: '',
        tag: '',
        body: 'updated notes',
        targetCommitish: '',
        prerelease: false,
        makeLatest: true,
        draft: true,
      },
    })

    expect(octokit.rest.repos.updateRelease).toHaveBeenCalledWith({
      owner: repository.owner,
      repo: repository.name,
      release_id: 43,
      name: 'Existing release',
      tag_name: 'v2',
      body: 'updated notes',
      draft: true,
      prerelease: false,
      make_latest: 'true',
    })
    expect(release).toMatchObject({
      id: 43,
      tagName: 'v2',
      name: 'Existing release',
      url: 'https://github.com/o/r/releases/43',
      uploadUrl: 'https://uploads.github.com/43',
    })
  })

  it('resolves branch, annotated tag, and pull request refs compatibly', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.graphql)
      .mockResolvedValueOnce({
        repository: { object: { __typename: 'Commit', oid: 'tag-sha' } },
      })
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            headRefOid: 'head-sha',
            potentialMergeCommit: { oid: 'merge-sha' },
          },
        },
      })
    const github = adapter(octokit)
    await expect(
      github.resolveCommitish({
        repository,
        commitish: 'refs/heads/feature/test',
      }),
    ).resolves.toBe('feature/test')
    await expect(
      github.resolveCommitish({ repository, commitish: 'refs/tags/v2' }),
    ).resolves.toBe('tag-sha')
    await expect(
      github.resolveCommitish({ repository, commitish: 'refs/pull/42/merge' }),
    ).resolves.toBe('merge-sha')
    expect(octokit.graphql).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('resolveCommitish'),
      expect.objectContaining({ expression: 'refs/tags/v2^{commit}' }),
    )
  })

  it('preserves raw config strings and decodes GHES base64 objects', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.getContent)
      .mockResolvedValueOnce({ data: 'raw: true\n' } as never)
      .mockResolvedValueOnce({
        data: {
          type: 'file',
          encoding: 'base64',
          content: Buffer.from('ghes: true\n').toString('base64'),
        },
      } as never)
    const github = adapter(octokit)
    await expect(
      github.getRepositoryConfig({
        repository,
        path: '.github/release-drafter.yml',
        ref: 'refs/heads/main',
      }),
    ).resolves.toBe('raw: true\n')
    expect(octokit.rest.repos.getContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ ref: 'main' }),
    )
    await expect(
      github.getRepositoryConfig({ repository, path: 'config.yml' }),
    ).resolves.toBe('ghes: true\n')
  })

  it('reports null repository config responses clearly', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.getContent).mockResolvedValue({
      data: null,
      headers: { 'content-type': 'application/json' },
    } as never)
    await expect(
      adapter(octokit).getRepositoryConfig({
        repository,
        path: '.github/release-drafter.yml',
      }),
    ).rejects.toThrow('Fetched content is null, expected a file')
  })
})
