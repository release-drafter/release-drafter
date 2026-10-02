import type { FindChangesRequest, Repository } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import { GitLabAdapter } from './index.ts'

const repository: Repository = {
  owner: 'group/subgroup',
  name: 'project',
  serverUrl: 'https://gitlab.example/',
}
const request = (
  overrides: Partial<FindChangesRequest> = {},
): FindChangesRequest => ({
  repository,
  comparison: { baseRef: 'v1', headRef: 'main' },
  pullRequestFields: {
    body: true,
    url: true,
    baseRefName: true,
    headRefName: true,
  },
  pullRequestLimit: 20,
  historyLimit: 100,
  includeChangedFiles: false,
  includeNewContributors: false,
  ...overrides,
})
const json = (
  body: unknown,
  init: ResponseInit = {},
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...headers },
  })
const pathOf = (input: Parameters<typeof globalThis.fetch>[0]) => {
  const url = new URL(String(input))
  return `${url.pathname}${url.search}`
}
const adapter = (
  fetch: typeof globalThis.fetch,
  limits: ConstructorParameters<typeof GitLabAdapter>[0]['limits'] = {},
) => new GitLabAdapter({ token: 'gitlab-token', fetch, limits })

const commit = (id: string, date: string, name = 'Commit Person') => ({
  id,
  message: `commit ${id}`,
  author_name: name,
  committed_date: date,
})
const mergeRequest = (
  iid: number,
  overrides: Record<string, unknown> = {},
) => ({
  iid,
  project_id: 10,
  source_project_id: 10,
  target_project_id: 10,
  title: `MR ${iid}`,
  description: `body ${iid}`,
  state: 'merged',
  merged_at: `2026-01-0${iid}T00:00:00Z`,
  target_branch: 'main',
  source_branch: `feature-${iid}`,
  web_url: `https://gitlab.example/group/subgroup/project/-/merge_requests/${iid}`,
  author: {
    username: `user${iid}`,
    name: `Display ${iid}`,
    web_url: `https://gitlab.example/user${iid}`,
  },
  labels: ['feature'],
  merge_commit_sha: `merge-${iid}`,
  ...overrides,
})

describe('GitLab response fallbacks', () => {
  it('rejects a list whose advertised total changes between pages', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const page = new URL(String(input)).searchParams.get('page')
      return json(
        [{ tag_name: `v${page}` }],
        {},
        { 'x-total': page === '1' ? '3' : '4', 'x-next-page': '2' },
      )
    })
    await expect(adapter(fetch).listReleases({ repository })).rejects.toThrow(
      'total changed from 3 to 4',
    )
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it.each([true, false])(
    'rejects an empty final page before the advertised total, with total header: %s',
    async (keepTotal) => {
      const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
        const first = new URL(String(input)).searchParams.get('page') === '1'
        return json(
          first ? [{ tag_name: 'v1' }] : [],
          {},
          first
            ? { 'x-total': '3', 'x-next-page': '2' }
            : keepTotal
              ? { 'x-total': '3' }
              : {},
        )
      })
      await expect(adapter(fetch).listReleases({ repository })).rejects.toThrow(
        'expected 3 items but received 1',
      )
      expect(fetch).toHaveBeenCalledTimes(2)
    },
  )

  it('rejects lists exceeding the advertised total', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([{ tag_name: 'v1' }, { tag_name: 'v2' }], {}, { 'x-total': '1' }),
    )
    await expect(adapter(fetch).listReleases({ repository })).rejects.toThrow(
      'more items than the advertised total of 1',
    )
  })

  it('rejects an advertised total above the operation item limit before fetching another page', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([], {}, { 'x-total': '3' }),
    )
    await expect(
      adapter(fetch, { maxItemsPerList: 2 }).listReleases({ repository }),
    ).rejects.toThrow('advertised 3 items, above the 2 item limit')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('rejects an unadvertised list that grows beyond the item limit', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const page = new URL(String(input)).searchParams.get('page')
      return json(
        [{ tag_name: `v${page}` }],
        {},
        { 'x-next-page': String(Number(page) + 1) },
      )
    })
    await expect(
      adapter(fetch, { maxItemsPerList: 1, pageSize: 1 }).listReleases({
        repository,
      }),
    ).rejects.toThrow('exceeded the 1 item limit')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects a response whose advertised byte size exceeds the limit', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([], {}, { 'content-length': '1000' }),
    )
    await expect(
      adapter(fetch, { maxResponseBytes: 100 }).listReleases({ repository }),
    ).rejects.toThrow('100 byte response-size limit')
  })

  it.each([
    { maxPages: 0 },
    { concurrency: -1 },
    { pageSize: 1.5 },
    { retries: -1 },
    { retries: Number.NaN },
  ])(
    'rejects invalid operation limits before making requests: %j',
    async (limits) => {
      const fetch = vi.fn<typeof globalThis.fetch>()
      await expect(
        adapter(fetch, limits).listReleases({ repository }),
      ).rejects.toThrow('safe integer')
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('rejects blank authentication before making requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    await expect(
      new GitLabAdapter({ token: '  ', fetch }).listReleases({ repository }),
    ).rejects.toThrow('authentication token is required')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('orders undated commits and falls back to authored or created dates', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
      pathOf(input).includes('/compare?')
        ? json({
            commits: [
              { id: 'b' },
              { id: 'a' },
              { id: 'c', authored_date: '2026-01-01' },
              { id: 'd', created_at: '2026-01-02' },
            ],
          })
        : json([]),
    )
    const result = await adapter(fetch).findChanges(request())
    expect(result.commits).toEqual([
      { id: 'a', oid: 'a' },
      { id: 'b', oid: 'b' },
      { id: 'c', oid: 'c', committedAt: '2026-01-01' },
      { id: 'd', oid: 'd', committedAt: '2026-01-02' },
    ])
  })

  it('normalizes sparse merged requests and skips unrelated or unmerged requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
      pathOf(input).includes('/compare?')
        ? json({ commits: [{ id: 'a' }] })
        : json([
            mergeRequest(5, { state: 'opened' }),
            mergeRequest(6, { merged_at: null }),
            mergeRequest(7, { iid: undefined }),
            mergeRequest(8, { target_project_id: 20 }),
            ...[2, 1].map((iid) =>
              mergeRequest(iid, {
                merged_at: '2026-01-01',
                source_project_id: undefined,
                target_project_id: undefined,
                description: undefined,
                web_url: undefined,
                source_branch: undefined,
                target_branch: undefined,
                author: undefined,
                labels: undefined,
                merge_commit_sha: undefined,
              }),
            ),
          ]),
    )
    const result = await adapter(fetch).findChanges(
      request({ includeNewContributors: true }),
    )
    expect(result.pullRequests).toEqual(
      [1, 2].map((number) => ({
        number,
        title: `MR ${number}`,
        baseRepository: 'group/subgroup/project',
        isCrossRepository: false,
        mergedAt: '2026-01-01',
        mergeCommitOid: null,
        labels: [],
        body: null,
      })),
    )
    expect(result.commits[0]?.authors).toEqual([])
    expect(result.newContributorLogins).toEqual(new Set())
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('honors field selection, bot identity, labels and squash merge SHAs', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
      pathOf(input).includes('/compare?')
        ? json({ commits: [{ id: 'a' }] })
        : json([
            mergeRequest(1, {
              author: { username: ' bot ', bot: true },
              labels: ['feature', '', { name: 'fix' }, {}],
              merge_commit_sha: null,
              squash_commit_sha: 'squashed',
              source_project_id: 20,
            }),
          ]),
    )
    const result = await adapter(fetch).findChanges(
      request({
        pullRequestFields: {
          body: false,
          url: false,
          baseRefName: false,
          headRefName: false,
        },
      }),
    )
    expect(result.pullRequests).toEqual([
      {
        number: 1,
        title: 'MR 1',
        baseRepository: 'group/subgroup/project',
        isCrossRepository: true,
        mergedAt: '2026-01-01T00:00:00Z',
        mergeCommitOid: 'squashed',
        labels: ['feature', 'fix'],
        author: { login: 'bot', type: 'Bot' },
      },
    ])
  })

  it('uses old paths and ignores empty diffs when no file count was advertised', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path.includes('/compare?')) return json({ commits: [{ id: 'a' }] })
      if (path.includes('/diffs?'))
        return json([
          {},
          { new_path: '' },
          { old_path: 'deleted.ts' },
          { new_path: 'added.ts' },
          { old_path: 'deleted.ts' },
        ])
      return json([mergeRequest(1)])
    })
    const result = await adapter(fetch).findChanges(
      request({ includeChangedFiles: true }),
    )
    expect(result.pullRequests[0]?.changedFiles).toEqual([
      'added.ts',
      'deleted.ts',
    ])
  })

  it.each([
    ['9007199254740992', 'invalid or capped'],
    ['3', 'above the 2 file limit'],
  ])(
    'rejects unsafe or excessive changed-file counts: %s',
    async (changes_count, message) => {
      const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
        pathOf(input).includes('/compare?')
          ? json({ commits: [{ id: 'a' }] })
          : json([mergeRequest(1, { changes_count })]),
      )
      await expect(
        adapter(fetch, { maxChangedFiles: 2 }).findChanges(
          request({ includeChangedFiles: true }),
        ),
      ).rejects.toThrow(message)
      expect(fetch).toHaveBeenCalledTimes(2)
    },
  )

  it.each(['existing', 'unknown', 'failed'])(
    'keeps contributors conservative when first contribution is %s',
    async (state) => {
      const warning = vi.fn()
      const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
        const path = pathOf(input)
        if (path.includes('/compare?')) return json({ commits: [{ id: 'a' }] })
        if (path.includes('/commits/a/merge_requests?'))
          return json([mergeRequest(1)])
        if (state === 'failed')
          return json({ message: 'Forbidden' }, { status: 403 })
        return json(
          mergeRequest(
            1,
            state === 'existing' ? { first_contribution: false } : {},
          ),
        )
      })
      const result = await new GitLabAdapter({
        token: 'gitlab-token',
        fetch,
        logger: { debug: vi.fn(), info: vi.fn(), warning, error: vi.fn() },
      }).findChanges(request({ includeNewContributors: true }))
      expect(result.newContributorLogins).toEqual(new Set())
      expect(warning).toHaveBeenCalledTimes(state === 'existing' ? 0 : 1)
      if (state !== 'existing')
        expect(warning).toHaveBeenCalledWith(
          expect.stringContaining('will not be labeled new'),
        )
    },
  )

  it('retains minimal release data and created-date and tag-URL fallbacks', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([
        { tag_name: 'v1' },
        {
          tag_name: 'v2',
          created_at: '2026-01-01',
          tag_path: 'https://gitlab.example/v2',
        },
        { tag_name: 'v3', upcoming_release: true },
      ]),
    )
    await expect(adapter(fetch).listReleases({ repository })).resolves.toEqual([
      { id: 'v1', tagName: 'v1', draft: false, prerelease: false },
      {
        id: 'v2',
        tagName: 'v2',
        createdAt: '2026-01-01',
        url: 'https://gitlab.example/v2',
        draft: false,
        prerelease: false,
      },
    ])
  })

  it.each([{}, { default_branch: '  ' }])(
    'rejects absent or blank default branches: %j',
    async (response) => {
      const fetch = vi.fn<typeof globalThis.fetch>(async () => json(response))
      await expect(adapter(fetch).getDefaultBranch(repository)).rejects.toThrow(
        'blank default branch',
      )
      await expect(
        adapter(fetch).getRepositoryConfig({ repository, path: 'config.yml' }),
      ).rejects.toThrow('blank default branch')
    },
  )

  it('uses an explicit config ref without loading the default branch', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      expect(pathOf(input)).toContain(
        '/repository/files/config.yml?ref=release',
      )
      return json({
        encoding: 'base64',
        content: Buffer.from('template: ok').toString('base64'),
      })
    })
    await expect(
      adapter(fetch).getRepositoryConfig({
        repository,
        path: 'config.yml',
        ref: ' release ',
      }),
    ).resolves.toBe('template: ok')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it.each([{ content: 'text' }, { encoding: 'base64' }])(
    'rejects invalid config content: %j',
    async (response) => {
      await expect(
        adapter(
          vi.fn<typeof globalThis.fetch>(async () => json(response)),
        ).getRepositoryConfig({ repository, path: 'config.yml', ref: 'main' }),
      ).rejects.toThrow('not base64 content')
    },
  )

  it('defaults validation labels to an empty list', async () => {
    await expect(
      adapter(
        vi.fn<typeof globalThis.fetch>(async () =>
          json(mergeRequest(1, { labels: undefined })),
        ),
      ).getPullRequest({ repository, number: 1 }),
    ).resolves.toEqual({
      number: 1,
      title: 'MR 1',
      labels: [],
      baseRefName: 'main',
    })
  })

  it.each([
    'refs/merge-requests/no/head',
    'refs/merge-requests/1/head',
    'refs/merge-requests/1/merge',
    'refs/tags/v1',
  ])(
    'falls back when a ref is malformed or its commit is absent: %s',
    async (commitish) => {
      const warning = vi.fn()
      const fetch = vi.fn<typeof globalThis.fetch>(async () => json({}))
      const gitlab = new GitLabAdapter({
        token: 'gitlab-token',
        fetch,
        logger: { debug: vi.fn(), info: vi.fn(), warning, error: vi.fn() },
      })
      await expect(
        gitlab.resolveCommitish({ repository, commitish }),
      ).resolves.toBe('')
      expect(warning).toHaveBeenCalledOnce()
      expect(fetch).toHaveBeenCalledTimes(
        commitish.includes('/no/') ? 0 : commitish.endsWith('/merge') ? 2 : 1,
      )
    },
  )

  it('uses a squash SHA for a merge ref', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ squash_commit_sha: 'squashed' }),
    )
    await expect(
      adapter(fetch).resolveCommitish({
        repository,
        commitish: 'refs/merge-requests/1/merge',
      }),
    ).resolves.toBe('squashed')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('passes an unqualified commit reference through without a request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    await expect(
      adapter(fetch).resolveCommitish({ repository, commitish: 'abc123' }),
    ).resolves.toBe('abc123')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('GitLabAdapter', () => {
  it('loads the default branch and repository config through GitBeaker', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path === '/api/v4/projects/group%2Fsubgroup%2Fproject') {
        return json({ default_branch: 'trunk' })
      }
      expect(path).toBe(
        '/api/v4/projects/group%2Fsubgroup%2Fproject/repository/files/.github%2Frelease-drafter.yml?ref=trunk',
      )
      return json({
        encoding: 'base64',
        content: Buffer.from('template: "$CHANGES"\n').toString('base64'),
      })
    })
    const gitlab = adapter(fetch)

    await expect(
      gitlab.getRepositoryConfig({
        repository,
        path: '.github/release-drafter.yml',
      }),
    ).resolves.toBe('template: "$CHANGES"\n')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('shares the GitLab request budget while resolving a config default branch', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ default_branch: 'trunk' }),
    )

    await expect(
      adapter(fetch, { maxRequestsPerOperation: 1 }).getRepositoryConfig({
        repository,
        path: '.github/release-drafter.yml',
      }),
    ).rejects.toThrow('request limit of 1 was exceeded')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('uses normalized self-managed host, encoded project id, and private-token auth', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      expect(String(input)).toContain(
        'https://gitlab.example/api/v4/projects/group%2Fsubgroup%2Fproject/repository/compare',
      )
      expect(new Headers(init?.headers).get('private-token')).toBe(
        'gitlab-token',
      )
      return json({ compare_timeout: false, commits: [] })
    })
    const result = await adapter(fetch).findChanges(request())
    expect(result).toEqual({
      commits: [],
      pullRequests: [],
      newContributorLogins: new Set(),
    })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('reads merge request validation data from the project endpoint', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      expect(pathOf(input)).toBe(
        '/api/v4/projects/group%2Fsubgroup%2Fproject/merge_requests/12',
      )
      return json(
        mergeRequest(12, {
          title: '  feat: add search  ',
          target_branch: '  release/2.x  ',
          labels: ['feature', { name: 'approved' }, '', {}],
        }),
      )
    })

    await expect(
      adapter(fetch).getPullRequest({ repository, number: 12 }),
    ).resolves.toEqual({
      number: 12,
      title: 'feat: add search',
      labels: ['feature', 'approved'],
      baseRefName: 'release/2.x',
    })
  })

  it.each([
    {
      name: 'different iid',
      response: mergeRequest(13),
      expected: 'different iid',
    },
    {
      name: 'blank title',
      response: mergeRequest(12, { title: '  ' }),
      expected: 'blank title',
    },
    {
      name: 'blank target branch',
      response: mergeRequest(12, { target_branch: '  ' }),
      expected: 'blank target branch',
    },
  ])('rejects a merge request with a $name', async ({ response, expected }) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(response))

    await expect(
      adapter(fetch).getPullRequest({ repository, number: 12 }),
    ).rejects.toThrow(expected)
  })

  it('rejects comparison request timeouts', async () => {
    const timeoutFetch = vi.fn<typeof globalThis.fetch>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        }),
    )
    await expect(
      adapter(timeoutFetch, { timeoutMs: 1 }).findChanges(request()),
    ).rejects.toThrow('timed out after 1ms')
  })

  it('rejects comparisons without a complete commits array', async () => {
    await expect(
      adapter(vi.fn(async () => json({ compare_timeout: false }))).findChanges(
        request(),
      ),
    ).rejects.toThrow('complete commits array')
  })

  it('rejects comparisons above the configured commit limit', async () => {
    await expect(
      adapter(
        vi.fn(async () =>
          json({
            compare_timeout: false,
            commits: [commit('a', '2026-01-01'), commit('b', '2026-01-02')],
          }),
        ),
        { maxComparisonCommits: 1 },
      ).findChanges(request()),
    ).rejects.toThrow('above the 1 commit limit')
  })

  it('rejects comparisons above the configured byte limit', async () => {
    await expect(
      adapter(
        vi.fn(async () => json({ compare_timeout: false, commits: [] })),
        {
          maxComparisonBytes: 10,
        },
      ).findChanges(request()),
    ).rejects.toThrow('10 byte response-size limit')
  })

  it('rejects comparison commits without an id', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ compare_timeout: false, commits: [{ message: 'missing id' }] }),
    )

    await expect(adapter(fetch).findChanges(request())).rejects.toThrow(
      'GitLab comparison contained a commit without an id',
    )
  })

  it.each([
    {
      name: 'invalid iid',
      mergeRequest: mergeRequest(-1),
      error: 'Associated GitLab merge request omitted a valid iid',
    },
    {
      name: 'missing title',
      mergeRequest: mergeRequest(1, { title: undefined }),
      error: 'Associated GitLab merge request !1 omitted its title',
    },
  ])(
    'rejects an associated merge request with $name',
    async ({ mergeRequest: malformedMergeRequest, error }) => {
      const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
        const path = pathOf(input)
        if (path.includes('/repository/compare')) {
          return json({
            compare_timeout: false,
            commits: [commit('a', '2026-01-01')],
          })
        }
        if (path.includes('/commits/a/merge_requests')) {
          return json([malformedMergeRequest])
        }
        throw new Error(`Unexpected ${path}`)
      })

      await expect(adapter(fetch).findChanges(request())).rejects.toThrow(error)
    },
  )

  it('continues merge-request discovery when only comparison diffs timed out', async () => {
    const debug = vi.fn()
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path.includes('/repository/compare')) {
        return json({
          compare_timeout: true,
          commits: [commit('a', '2026-01-01')],
        })
      }
      if (path.includes('/commits/a/merge_requests')) {
        return json([mergeRequest(1)])
      }
      throw new Error(`Unexpected ${path}`)
    })
    const result = await new GitLabAdapter({
      token: 'gitlab-token',
      fetch,
      logger: { debug, info() {}, error() {}, warning() {} },
    }).findChanges(request())
    expect(result.commits.map(({ oid }) => oid)).toEqual(['a'])
    expect(result.pullRequests.map(({ number }) => number)).toEqual([1])
    expect(debug).toHaveBeenCalledWith(
      expect.stringContaining('merge-request discovery will continue'),
    )
  })

  it('discovers zero, one, and multiple merged MRs independent of response order', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path.includes('/repository/compare')) {
        return json({
          compare_timeout: false,
          commits: [
            commit('c', '2026-01-03'),
            commit('a', '2026-01-01'),
            commit('b', '2026-01-02'),
          ],
        })
      }
      if (path.includes('/commits/a/merge_requests')) return json([])
      if (path.includes('/commits/b/merge_requests'))
        return json([mergeRequest(2)])
      if (path.includes('/commits/c/merge_requests')) {
        return json([mergeRequest(3), mergeRequest(1), mergeRequest(2)])
      }
      throw new Error(`Unexpected ${path}`)
    })
    const result = await adapter(fetch).findChanges(request())
    expect(result.commits.map(({ oid }) => oid)).toEqual(['a', 'b', 'c'])
    expect(result.pullRequests.map(({ number }) => number)).toEqual([1, 2, 3])
    expect(
      result.commits.map(
        ({ associatedPullRequests }) => associatedPullRequests,
      ),
    ).toEqual([
      undefined,
      [{ number: 2, baseRepository: 'group/subgroup/project' }],
      [
        { number: 1, baseRepository: 'group/subgroup/project' },
        { number: 2, baseRepository: 'group/subgroup/project' },
        { number: 3, baseRepository: 'group/subgroup/project' },
      ],
    ])
    expect(result.pullRequests[0]).toMatchObject({
      body: 'body 1',
      url: expect.stringContaining('/merge_requests/1'),
      baseRefName: 'main',
      headRefName: 'feature-1',
      author: { login: 'user1' },
    })
  })

  it("paginates associated merge requests above GitLab's 100-item page cap", async () => {
    const mergeRequests = Array.from({ length: 150 }, (_, index) =>
      mergeRequest(index + 1),
    )
    const pages: number[] = []
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.includes('/repository/compare')) {
        return json({
          compare_timeout: false,
          commits: [commit('a', '2026-01-01')],
        })
      }
      if (url.pathname.includes('/commits/a/merge_requests')) {
        expect(url.searchParams.get('per_page')).toBe('100')
        const page = Number(url.searchParams.get('page'))
        pages.push(page)
        return json(
          page === 1 ? mergeRequests.slice(0, 100) : mergeRequests.slice(100),
          {},
          {
            'x-next-page': page === 1 ? '2' : '',
            'x-total': String(mergeRequests.length),
          },
        )
      }
      throw new Error(`Unexpected ${url}`)
    })

    const result = await adapter(fetch, {
      maxAssociatedMergeRequests: 150,
      pageSize: 150,
    }).findChanges(request({ pullRequestLimit: 150 }))

    expect(result.pullRequests).toHaveLength(150)
    expect(pages).toEqual([1, 2])
  })

  it('loads bounded changed files and rejects advertised incompleteness', async () => {
    const makeFetch = (diffs: unknown[]) =>
      vi.fn<typeof globalThis.fetch>(async (input) => {
        const path = pathOf(input)
        if (path.includes('/repository/compare')) {
          return json({
            compare_timeout: false,
            commits: [commit('a', '2026-01-01')],
          })
        }
        if (path.includes('/commits/a/merge_requests')) {
          return json([mergeRequest(1, { changes_count: '2' })])
        }
        if (path.includes('/merge_requests/1/diffs')) {
          return json(diffs, {}, { 'x-total': String(diffs.length) })
        }
        throw new Error(`Unexpected ${path}`)
      })
    await expect(
      adapter(
        makeFetch([{ new_path: 'b.ts' }, { old_path: 'a.ts' }]),
      ).findChanges(request({ includeChangedFiles: true })),
    ).resolves.toMatchObject({
      pullRequests: [{ changedFiles: ['a.ts', 'b.ts'] }],
    })
    await expect(
      adapter(makeFetch([{ new_path: 'only.ts' }])).findChanges(
        request({ includeChangedFiles: true }),
      ),
    ).rejects.toThrow('incomplete: expected 2 files but received 1')
  })

  it.each(['1000+', 'unknown'])(
    'rejects invalid or capped changed-file count %s before loading diffs',
    async (changesCount) => {
      const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
        const path = pathOf(input)
        if (path.includes('/repository/compare')) {
          return json({
            compare_timeout: false,
            commits: [commit('a', '2026-01-01')],
          })
        }
        if (path.includes('/commits/a/merge_requests')) {
          return json([mergeRequest(1, { changes_count: changesCount })])
        }
        throw new Error(`Unexpected ${path}`)
      })
      await expect(
        adapter(fetch).findChanges(request({ includeChangedFiles: true })),
      ).rejects.toThrow(`invalid or capped changed-file count: ${changesCount}`)
      expect(
        fetch.mock.calls.some(([input]) =>
          pathOf(input).includes('/merge_requests/1/diffs'),
        ),
      ).toBe(false)
    },
  )

  it('uses GitLab first_contribution without confusing display names for usernames', async () => {
    const warning = vi.fn()
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path.includes('/repository/compare')) {
        return json({
          compare_timeout: false,
          commits: [commit('a', '2026-01-01', 'shared-name')],
        })
      }
      if (path.includes('/commits/a/merge_requests')) {
        return json([
          mergeRequest(1, {
            author: { username: 'actual-user', name: 'shared-name' },
          }),
        ])
      }
      if (path.includes('/merge_requests/1')) {
        return json(
          mergeRequest(1, {
            author: { username: 'actual-user', name: 'shared-name' },
            first_contribution: true,
          }),
        )
      }
      throw new Error(`Unexpected ${path}`)
    })
    const result = await new GitLabAdapter({
      token: 'gitlab-token',
      fetch,
      logger: { debug() {}, info() {}, error() {}, warning },
    }).findChanges(request({ includeNewContributors: true }))
    expect(result.newContributorLogins).toEqual(new Set(['actual-user']))
    expect(result.commits[0]?.author).toEqual({ name: 'shared-name' })
    expect(result.commits[0]?.authors).toContainEqual({
      login: 'actual-user',
      type: undefined,
    })
    expect(warning).not.toHaveBeenCalled()
  })

  it('bounds pagination, associated MRs, requests, and retries', async () => {
    const pageFetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([], {}, { 'x-next-page': '2' }),
    )
    await expect(
      adapter(pageFetch, { maxPages: 1 }).listReleases({ repository }),
    ).rejects.toThrow('1 page limit')

    const associatedFetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path.includes('/repository/compare')) {
        return json({
          compare_timeout: false,
          commits: [commit('a', '2026-01-01')],
        })
      }
      return json([mergeRequest(1), mergeRequest(2)])
    })
    await expect(
      adapter(associatedFetch, { maxAssociatedMergeRequests: 1 }).findChanges(
        request({ pullRequestLimit: 10 }),
      ),
    ).rejects.toThrow('1 associated merge-request limit')

    const retryFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        json({ message: 'busy' }, { status: 429 }, { 'retry-after': '0' }),
      )
      .mockResolvedValueOnce(json([]))
    await expect(
      adapter(retryFetch, {
        retries: 1,
        retryBaseDelayMs: 1,
        maxRetryDelayMs: 1,
      }).listReleases({ repository }),
    ).resolves.toEqual([])
    expect(retryFetch).toHaveBeenCalledTimes(2)

    await expect(
      adapter(
        vi.fn(async () => json([], {}, { 'x-next-page': '2' })),
        {
          maxRequestsPerOperation: 1,
          maxPages: 2,
        },
      ).listReleases({ repository }),
    ).rejects.toThrow('request limit of 1')
  })

  it.each<{
    name: string
    headers: Record<string, string>
    expectedWait: number
  }>([
    { name: 'absent', headers: {}, expectedWait: 2 },
    { name: 'valid', headers: { 'retry-after': '0.001' }, expectedWait: 1 },
    { name: 'malformed', headers: { 'retry-after': 'later' }, expectedWait: 2 },
  ])(
    'uses the correct retry delay for a $name Retry-After header',
    async ({ headers, expectedWait }) => {
      const debug = vi.fn()
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(
          json({ message: 'busy' }, { status: 429 }, headers),
        )
        .mockResolvedValueOnce(json([]))
      await expect(
        new GitLabAdapter({
          token: 'gitlab-token',
          fetch,
          logger: { debug, info() {}, error() {}, warning() {} },
          limits: {
            retries: 1,
            retryBaseDelayMs: 2,
            maxRetryDelayMs: 10,
          },
        }).listReleases({ repository }),
      ).resolves.toEqual([])
      expect(debug).toHaveBeenCalledWith(
        expect.stringContaining(`after ${expectedWait}ms`),
      )
      expect(fetch).toHaveBeenCalledTimes(2)
    },
  )

  it('performs only one POST attempt for transient HTTP and network failures', async () => {
    const payload = {
      name: 'Two',
      tag: 'v2',
      body: 'notes',
      targetCommitish: 'main',
      prerelease: false,
      makeLatest: true,
      draft: false,
    }
    const transientFetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ message: 'busy' }, { status: 503 }),
    )
    await expect(
      adapter(transientFetch, { retries: 3 }).createRelease({
        repository,
        payload,
      }),
    ).rejects.toThrow('GitLab POST request failed with 503')
    expect(transientFetch).toHaveBeenCalledOnce()

    const networkFetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new Error('socket reset')
    })
    await expect(
      adapter(networkFetch, { retries: 3 }).createRelease({
        repository,
        payload,
      }),
    ).rejects.toThrow('GitLab POST request failed: socket reset')
    expect(networkFetch).toHaveBeenCalledOnce()
  })

  it('does not follow cross-origin redirects or forward the private token', async () => {
    const firstOrigin = 'https://gitlab.example'
    const secondOrigin = 'https://redirect.example'
    let secondOriginToken: string | undefined
    const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      if (init?.redirect !== 'manual') {
        secondOriginToken =
          new Headers(init?.headers).get('private-token') ?? undefined
        return json([])
      }
      return new Response(null, {
        status: 302,
        headers: { location: `${secondOrigin}/redirected` },
      })
    })

    await expect(
      adapter(fetch).listReleases({
        repository: { ...repository, serverUrl: firstOrigin },
      }),
    ).rejects.toThrow('GitLab GET request failed with 302')
    expect(fetch).toHaveBeenCalledOnce()
    expect(secondOriginToken).toBeUndefined()
  })

  it('redacts tokens and reports request and rate-limit metadata', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response('failure gitlab-token', {
          status: 500,
          headers: {
            'x-request-id': 'req-123',
            'ratelimit-remaining': '0',
            'ratelimit-reset': '12345',
          },
        }),
    )
    const error = await adapter(fetch, { retries: 0 })
      .listReleases({ repository })
      .catch((caught: unknown) => caught)
    expect(String(error)).not.toContain('gitlab-token')
    expect(String(error)).toContain('[REDACTED]')
    expect(String(error)).toContain('request id: req-123')
    expect(String(error)).toContain('rate limit remaining: 0')
  })

  it('resolves branches, GitLab MR refs, tags, and gracefully falls back', async () => {
    const warning = vi.fn()
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = pathOf(input)
      if (path.includes('/merge_requests/7')) {
        return json({ sha: 'head-sha', merge_commit_sha: 'merge-sha' })
      }
      if (path.includes('/repository/tags/v1')) {
        return json({ commit: { id: 'tag-sha' } })
      }
      return json({ message: 'missing' }, { status: 404 })
    })
    const instance = new GitLabAdapter({
      token: 'gitlab-token',
      fetch,
      logger: { debug() {}, info() {}, error() {}, warning },
      limits: { retries: 0 },
    })
    await expect(
      instance.resolveCommitish({ repository, commitish: 'refs/heads/main' }),
    ).resolves.toBe('main')
    await expect(
      instance.resolveCommitish({
        repository,
        commitish: 'refs/merge-requests/7/head',
      }),
    ).resolves.toBe('head-sha')
    await expect(
      instance.resolveCommitish({
        repository,
        commitish: 'refs/merge-requests/7/merge',
      }),
    ).resolves.toBe('merge-sha')
    await expect(
      instance.resolveCommitish({
        repository,
        commitish: 'refs/merge-requests/9/merge',
      }),
    ).resolves.toBe('')
    await expect(
      instance.resolveCommitish({ repository, commitish: 'refs/tags/v1' }),
    ).resolves.toBe('tag-sha')
    await expect(
      instance.resolveCommitish({ repository, commitish: 'refs/tags/missing' }),
    ).resolves.toBe('')
    expect(warning).toHaveBeenCalled()
  })

  it('resolves an open MR synthetic merge ref when merge SHAs are unavailable', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = decodeURIComponent(pathOf(input))
      if (path.includes('/merge_requests/8')) {
        return json({
          state: 'opened',
          sha: 'head-sha',
          merge_commit_sha: null,
          squash_commit_sha: null,
        })
      }
      if (path.includes('/repository/commits/refs/merge-requests/8/merge')) {
        return json({ id: 'synthetic-merge-sha' })
      }
      throw new Error(`Unexpected ${path}`)
    })

    await expect(
      adapter(fetch).resolveCommitish({
        repository,
        commitish: 'refs/merge-requests/8/merge',
      }),
    ).resolves.toBe('synthetic-merge-sha')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('lists, creates, and updates normalized no-draft releases', async () => {
    const methods: string[] = []
    const bodies: unknown[] = []
    const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      methods.push(init?.method ?? 'GET')
      if (init?.body) bodies.push(JSON.parse(String(init.body)))
      const isWrite = init?.method === 'POST' || init?.method === 'PUT'
      const tag = init?.method === 'POST' ? 'v2' : 'v1'
      const release = {
        name: tag === 'v2' ? 'Two' : 'One',
        tag_name: tag,
        created_at: '2026-01-01T00:00:00Z',
        released_at: '2026-01-02T00:00:00Z',
        commit: { id: 'main-sha' },
        _links: { self: `https://gitlab.example/releases/${tag}` },
      }
      return json(
        isWrite
          ? release
          : [
              { ...release, tag_name: 'future', upcoming_release: true },
              release,
            ],
        { status: init?.method === 'POST' ? 201 : 200 },
        isWrite ? {} : { 'x-total': '2' },
      )
    })
    const instance = adapter(fetch)
    expect(instance.capabilities).toEqual({ draftReleases: false })
    await expect(instance.listReleases({ repository })).resolves.toEqual([
      expect.objectContaining({
        id: 'v1',
        tagName: 'v1',
        createdAt: '2026-01-02T00:00:00Z',
        draft: false,
        prerelease: false,
      }),
    ])
    const payload = {
      name: 'Two',
      tag: 'v2',
      body: 'notes',
      targetCommitish: 'main',
      prerelease: false,
      makeLatest: true,
      draft: false,
    }
    await expect(
      instance.createRelease({ repository, payload }),
    ).resolves.toMatchObject({ tagName: 'v2', draft: false })
    await expect(
      instance.updateRelease({
        repository,
        release: { id: 'v1', tagName: 'v1' },
        payload,
      }),
    ).resolves.toMatchObject({ tagName: 'v1', draft: false })
    expect(methods).toEqual(['GET', 'POST', 'PUT'])
    expect(bodies).toEqual([
      { name: 'Two', tag_name: 'v2', description: 'notes', ref: 'main' },
      { name: 'Two', description: 'notes' },
    ])
  })

  it.each(['creation', 'update'] as const)(
    'rejects prerelease %s before constructing or sending a request',
    async (operation) => {
      const fetch = vi.fn<typeof globalThis.fetch>()
      const instance = new GitLabAdapter({ token: '', fetch })
      const payload = {
        name: 'Two',
        tag: 'v2',
        body: 'notes',
        targetCommitish: 'main',
        prerelease: true,
        makeLatest: true,
        draft: false,
      }
      const result =
        operation === 'creation'
          ? instance.createRelease({ repository, payload })
          : instance.updateRelease({
              repository,
              release: { id: 'v1', tagName: 'v1' },
              payload,
            })

      await expect(result).rejects.toThrow(
        'GitLab does not support prerelease releases',
      )
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('rejects draft creation and updates before constructing or sending a request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const instance = new GitLabAdapter({ token: '', fetch })
    const payload = {
      name: 'Two',
      tag: 'v2',
      body: 'notes',
      targetCommitish: 'main',
      prerelease: false,
      makeLatest: true,
      draft: true,
    }

    await expect(
      instance.createRelease({ repository, payload }),
    ).rejects.toThrow('GitLab does not support draft releases')
    await expect(
      instance.updateRelease({
        repository,
        release: { id: 'v1', tagName: 'v1' },
        payload,
      }),
    ).rejects.toThrow('GitLab does not support draft releases')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects releases without a tag name', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([{ name: 'Malformed release' }], {}, { 'x-total': '1' }),
    )

    await expect(adapter(fetch).listReleases({ repository })).rejects.toThrow(
      'GitLab release response omitted its tag name',
    )
  })
})
