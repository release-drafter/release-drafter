import type { FindChangesRequest, Repository } from '@release-drafter/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubAdapter, type GitHubOctokit } from './index.ts'

afterEach(() => vi.restoreAllMocks())

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
        get: vi.fn(),
      },
      pulls: { get: vi.fn(), listFiles: vi.fn() },
    },
    paginate: Object.assign(vi.fn(), { iterator: vi.fn() }),
    graphql: vi.fn(),
    ...overrides,
  }) as unknown as GitHubOctokit

const adapter = (octokit: GitHubOctokit) =>
  new GitHubAdapter({ token: 'token', octokit })

const changesRequest = (
  overrides: Partial<FindChangesRequest> = {},
): FindChangesRequest => ({
  repository,
  comparison: { baseRef: 'v1', headRef: 'refs/tags/v2' },
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
  ...overrides,
})

const comparisonWithPullRequests = (
  octokit: GitHubOctokit,
  pullRequests: unknown[],
) => {
  vi.mocked(octokit.paginate.iterator).mockReturnValue(
    (async function* () {
      yield { data: { commits: [{ sha: 'commit' }] } }
    })() as never,
  )
  vi.mocked(octokit.graphql).mockResolvedValueOnce({
    repository: {
      object: {
        __typename: 'Commit',
        history: {
          pageInfo: { hasNextPage: false },
          nodes: [
            { oid: 'commit', associatedPullRequests: { nodes: pullRequests } },
          ],
        },
      },
    },
  })
}

describe('GitHubAdapter', () => {
  it.each([undefined, null, [null, { number: 1, title: 'Unresolved merge' }]])(
    'keeps comparison commits when recent PR nodes are incomplete: %j',
    async (nodes) => {
      const octokit = mockOctokit()
      comparisonWithPullRequests(octokit, [])
      vi.mocked(octokit.graphql).mockReset()
      vi.mocked(octokit.graphql)
        .mockResolvedValueOnce({
          repository: {
            object: {
              __typename: 'Commit',
              history: {
                pageInfo: { hasNextPage: false },
                nodes: [
                  { oid: 'commit', associatedPullRequests: { nodes: null } },
                ],
              },
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequests: { nodes, pageInfo: { hasNextPage: false } },
          },
        })
      const result = await adapter(octokit).findChanges(
        changesRequest({ comparison: { baseRef: 'v1', headRef: 'main' } }),
      )
      expect(result.commits.map(({ oid }) => oid)).toEqual(['commit'])
      expect(result.pullRequests).toEqual([])
      expect(octokit.graphql).toHaveBeenCalledTimes(2)
    },
  )

  it.each([undefined, null, [null, {}, { path: '' }, { path: 'src/a.ts' }]])(
    'handles incomplete file nodes without inventing paths: %j',
    async (nodes) => {
      const octokit = mockOctokit()
      vi.mocked(octokit.graphql).mockResolvedValueOnce({
        repository: {
          pullRequest: { files: { nodes, pageInfo: { hasNextPage: false } } },
        },
      })
      await expect(
        adapter(octokit).findPullRequestChangedFiles({ repository, number: 1 }),
      ).resolves.toEqual(nodes ? ['src/a.ts'] : [])
    },
  )

  it.each(['text/plain; charset=utf-8', 'application/vnd.github.v3.raw'])(
    'accepts raw config media types: %s',
    async (contentType) => {
      const octokit = mockOctokit()
      vi.mocked(octokit.rest.repos.getContent).mockResolvedValueOnce({
        data: 'template: "$CHANGES"',
        headers: { 'content-type': contentType },
      } as never)
      await expect(
        adapter(octokit).getRepositoryConfig({
          repository,
          path: 'config.yml',
        }),
      ).resolves.toBe('template: "$CHANGES"')
    },
  )

  it('decodes a UTF-8 file response without treating it as base64', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.getContent).mockResolvedValueOnce({
      data: { type: 'file', encoding: 'utf-8', content: 'template: "Résumé"' },
    } as never)
    await expect(
      adapter(octokit).getRepositoryConfig({ repository, path: 'config.yml' }),
    ).resolves.toBe('template: "Résumé"')
  })

  it.each(['create', 'update'] as const)(
    'passes latest false for stable release %s requests',
    async (operation) => {
      const octokit = mockOctokit()
      const send =
        operation === 'create'
          ? octokit.rest.repos.createRelease
          : octokit.rest.repos.updateRelease
      vi.mocked(send).mockResolvedValueOnce({
        data: { id: 1, tag_name: 'v1' },
      } as never)
      const payload = {
        name: '',
        tag: '',
        body: 'Notes',
        targetCommitish: '',
        prerelease: false,
        makeLatest: false,
        draft: false,
      }
      if (operation === 'create')
        await adapter(octokit).createRelease({ repository, payload })
      else
        await adapter(octokit).updateRelease({
          repository,
          release: { id: 1, tagName: 'v1' },
          payload,
        })
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ make_latest: 'false' }),
      )
      if (operation === 'update') {
        expect(vi.mocked(send).mock.calls[0]?.[0]).not.toHaveProperty('name')
        expect(vi.mocked(send).mock.calls[0]?.[0]).toHaveProperty(
          'tag_name',
          'v1',
        )
      }
    },
  )

  it('reads normalized pull request validation data', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.pulls.get).mockResolvedValue({
      data: {
        title: 'feat: validate pull requests',
        base: { ref: 'main' },
        labels: [{ name: 'feature' }, { name: '' }, 'approved'],
      },
    } as never)

    await expect(
      adapter(octokit).getPullRequest({ repository, number: 42 }),
    ).resolves.toEqual({
      number: 42,
      title: 'feat: validate pull requests',
      baseRefName: 'main',
      labels: ['feature', 'approved'],
    })
    expect(octokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: repository.owner,
      repo: repository.name,
      pull_number: 42,
    })
  })

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
    vi.useFakeTimers()
    try {
      const transientFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('temporary', { status: 500 }))
        .mockResolvedValueOnce(
          Response.json({ id: 1, name: 'release-drafter' }),
        )
      const transient = new GitHubAdapter({
        token: 'token',
        fetch: transientFetch,
      })

      const transientRequest = expect(
        transient.octokit.request('GET /repos/{owner}/{repo}', {
          owner: 'release-drafter',
          repo: 'release-drafter',
        }),
      ).resolves.toMatchObject({ status: 200 })
      await vi.runAllTimersAsync()
      await transientRequest
      expect(transientFetch).toHaveBeenCalledTimes(2)

      const missingFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('missing', { status: 404 }))
      const missing = new GitHubAdapter({ token: 'token', fetch: missingFetch })
      const missingRequest = expect(
        missing.octokit.request('GET /repos/{owner}/{repo}', {
          owner: 'release-drafter',
          repo: 'missing',
        }),
      ).rejects.toMatchObject({ status: 404 })
      await vi.runAllTimersAsync()
      await missingRequest
      expect(missingFetch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
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

  it('uses the runtime fetch without adding a proxy dispatcher', async () => {
    const runtimeFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ default_branch: 'main' }))
    const github = new GitHubAdapter({ token: 'token' })

    await expect(github.getDefaultBranch(repository)).resolves.toBe('main')
    expect(runtimeFetch).toHaveBeenCalledOnce()
    expect(runtimeFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/release-drafter/release-drafter',
      expect.not.objectContaining({ dispatcher: expect.anything() }),
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

  it('bounds recent pull request recovery to one small page', async () => {
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
            nodes: [
              pullRequest(2, 'unrelated-oid'),
              pullRequest(1, 'matching-oid'),
            ],
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
      2,
      expect.stringContaining('findRecentMergedPullRequests'),
      expect.objectContaining({ cursor: null, limit: 5 }),
    )
    expect(octokit.graphql).toHaveBeenCalledTimes(2)
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

describe('GitHub adapter response boundaries', () => {
  it('trims the default branch and rejects missing or blank branches', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.get)
      .mockResolvedValueOnce({ data: { default_branch: ' main ' } } as never)
      .mockResolvedValueOnce({ data: { default_branch: ' ' } } as never)
      .mockResolvedValueOnce({ data: {} } as never)
    const github = adapter(octokit)
    await expect(github.getDefaultBranch(repository)).resolves.toBe('main')
    expect(octokit.rest.repos.get).toHaveBeenCalledWith({
      owner: repository.owner,
      repo: repository.name,
    })
    for (let index = 0; index < 2; index++) {
      await expect(github.getDefaultBranch(repository)).rejects.toThrow(
        'GitHub returned a blank default branch',
      )
    }
  })

  it.each([
    [{ title: ' ', base: { ref: 'main' } }, 'blank title'],
    [{ title: 'Valid', base: { ref: ' ' } }, 'blank base branch'],
  ])('rejects invalid pull request validation data', async (data, message) => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.pulls.get).mockResolvedValue({ data } as never)
    await expect(
      adapter(octokit).getPullRequest({ repository, number: 7 }),
    ).rejects.toThrow(`Pull request #7 returned a ${message}`)
  })

  it.each([
    { repository: null },
    { repository: { object: { __typename: 'Tag' } } },
    { repository: { object: { __typename: 'Commit', history: null } } },
  ])('rejects a comparison head without commit history', async (response) => {
    const octokit = mockOctokit()
    comparisonWithPullRequests(octokit, [])
    vi.mocked(octokit.graphql).mockReset().mockResolvedValueOnce(response)
    await expect(
      adapter(octokit).findChanges(changesRequest()),
    ).rejects.toThrow(
      'GitHub GraphQL head ref refs/tags/v2 did not resolve to a commit',
    )
  })

  it.each([false, true])(
    'rejects missing comparison commits with hasNextPage=%s and no cursor',
    async (hasNextPage) => {
      const octokit = mockOctokit()
      comparisonWithPullRequests(octokit, [])
      vi.mocked(octokit.graphql)
        .mockReset()
        .mockResolvedValueOnce({
          repository: {
            object: {
              __typename: 'Commit',
              history: {
                pageInfo: { hasNextPage, endCursor: null },
                nodes: [null, { oid: 'unrelated' }],
              },
            },
          },
        })
      await expect(
        adapter(octokit).findChanges(changesRequest()),
      ).rejects.toThrow('did not return data for 1 comparison commits: commit')
      expect(octokit.graphql).toHaveBeenCalledTimes(1)
    },
  )

  it('requires a recent pull request connection for branch comparisons', async () => {
    const octokit = mockOctokit()
    comparisonWithPullRequests(octokit, [null])
    vi.mocked(octokit.graphql).mockResolvedValueOnce({ repository: null })
    await expect(
      adapter(octokit).findChanges(
        changesRequest({
          comparison: { baseRef: 'v1', headRef: 'refs/heads/main' },
        }),
      ),
    ).rejects.toThrow('Query returned no recent pull request connection')
    expect(octokit.graphql).toHaveBeenLastCalledWith(
      expect.stringContaining('findRecentMergedPullRequests'),
      expect.objectContaining({ baseRefName: 'main' }),
    )
  })

  it('keeps the pull request number and cause when file discovery fails', async () => {
    const octokit = mockOctokit()
    comparisonWithPullRequests(octokit, [
      {
        number: 7,
        title: 'Change',
        merged: true,
        baseRepository: { nameWithOwner: 'release-drafter/release-drafter' },
      },
    ])
    vi.mocked(octokit.graphql).mockResolvedValueOnce({ repository: null })
    await expect(
      adapter(octokit).findChanges(
        changesRequest({ includeChangedFiles: true }),
      ),
    ).rejects.toMatchObject({
      message: 'Failed to list changed files for pull request #7.',
      cause: new Error('Query returned no pull request file connection'),
    })
  })

  it('finds new human contributors from their earliest merge and batches searches', async () => {
    const octokit = mockOctokit()
    const pullRequest = (
      number: number,
      login: string,
      mergedAt: string | null,
      type = 'User',
    ) => ({
      number,
      title: `Change ${number}`,
      merged: true,
      mergedAt,
      author: { __typename: type, login },
      baseRepository: { nameWithOwner: 'release-drafter/release-drafter' },
    })
    const pullRequests = Array.from({ length: 21 }, (_, index) =>
      pullRequest(index + 1, `user${index}`, '2026-01-02T00:00:00Z'),
    )
    comparisonWithPullRequests(octokit, [
      ...pullRequests,
      pullRequest(22, 'user0', '2026-01-01T00:00:00Z'),
      pullRequest(23, 'user0', '2026-01-03T00:00:00Z'),
      pullRequest(24, 'automation', '2026-01-01T00:00:00Z', 'Bot'),
      pullRequest(25, 'undated', null),
    ])
    vi.mocked(octokit.graphql)
      .mockResolvedValueOnce(
        Object.fromEntries(
          Array.from({ length: 20 }, (_, index) => [
            `author${index}`,
            { issueCount: index === 1 ? 1 : 0 },
          ]),
        ),
      )
      .mockResolvedValueOnce({ author0: { issueCount: 0 } })
    const result = await new GitHubAdapter({
      token: 'token',
      octokit,
      contributorConcurrency: 1,
    }).findChanges(changesRequest({ includeNewContributors: true }))
    expect(result.newContributorLogins).toEqual(
      new Set(
        Array.from({ length: 21 }, (_, index) => `user${index}`).filter(
          (login) => login !== 'user1',
        ),
      ),
    )
    expect(octokit.graphql).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('findPreviousContributions'),
      expect.objectContaining({
        query0:
          'repo:release-drafter/release-drafter is:pr is:merged author:user0 merged:<2026-01-01T00:00:00Z',
      }),
    )
    expect(octokit.graphql).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('findPreviousContributions'),
      {
        query0:
          'repo:release-drafter/release-drafter is:pr is:merged author:user20 merged:<2026-01-02T00:00:00Z',
      },
    )
  })

  it.each([
    ['refs/tags/missing', { repository: { object: { __typename: 'Tag' } } }],
    ['refs/pull/7/head', { repository: { pullRequest: {} } }],
    ['refs/pull/7/merge', { repository: null }],
  ])(
    'warns and falls back when %s cannot resolve',
    async (commitish, response) => {
      const octokit = mockOctokit()
      vi.mocked(octokit.graphql).mockResolvedValueOnce(response)
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
      }
      const github = new GitHubAdapter({ token: 'token', octokit, logger })
      await expect(
        github.resolveCommitish({ repository, commitish }),
      ).resolves.toBe('')
      expect(logger.warning).toHaveBeenCalledWith(
        `GitHub could not resolve ${commitish} to a commit SHA. Release Drafter will use the default branch.`,
      )
    },
  )

  it('warns about malformed pull refs without querying GitHub', async () => {
    const octokit = mockOctokit()
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    }
    const github = new GitHubAdapter({ token: 'token', octokit, logger })
    await expect(
      github.resolveCommitish({ repository, commitish: 'refs/pull/7/other' }),
    ).resolves.toBe('')
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining('is not a supported pull request ref'),
    )
    expect(octokit.graphql).not.toHaveBeenCalled()
  })

  it.each([
    [{ data: [], headers: {} }, 'directory (array)'],
    [
      { data: 'not raw', headers: { 'content-type': 'application/json' } },
      'wrong content-type',
    ],
    [{ data: { type: 'symlink', content: 'target' } }, 'wrong type (symlink)'],
    [{ data: { type: 'file' } }, 'not a string'],
  ])(
    'rejects non-file repository config responses',
    async (response, message) => {
      const octokit = mockOctokit()
      vi.mocked(octokit.rest.repos.getContent).mockResolvedValueOnce(
        response as never,
      )
      await expect(
        adapter(octokit).getRepositoryConfig({
          repository,
          path: 'config.yml',
        }),
      ).rejects.toThrow(message)
    },
  )

  it('reports repository config transport failures', async () => {
    const octokit = mockOctokit()
    vi.mocked(octokit.rest.repos.getContent).mockRejectedValueOnce(
      new Error('connection lost'),
    )
    await expect(
      adapter(octokit).getRepositoryConfig({ repository, path: 'config.yml' }),
    ).rejects.toThrow('Failed to fetch config from repo: connection lost')
  })
})
