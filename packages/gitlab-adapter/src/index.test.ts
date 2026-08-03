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

describe('GitLabAdapter', () => {
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

  it('rejects request timeouts, incomplete, oversized, and over-byte-limit comparisons', async () => {
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
    await expect(
      adapter(vi.fn(async () => json({ compare_timeout: false }))).findChanges(
        request(),
      ),
    ).rejects.toThrow('complete commits array')
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
  ])('rejects an associated merge request with $name', async ({
    mergeRequest: malformedMergeRequest,
    error,
  }) => {
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
  })

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

  it.each([
    '1000+',
    'unknown',
  ])('rejects invalid or capped changed-file count %s before loading diffs', async (changesCount) => {
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
  })

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
  ])('uses the correct retry delay for a $name Retry-After header', async ({
    headers,
    expectedWait,
  }) => {
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
      instance.resolveCommitish({ repository, commitish: 'refs/tags/v1' }),
    ).resolves.toBe('tag-sha')
    await expect(
      instance.resolveCommitish({ repository, commitish: 'refs/tags/missing' }),
    ).resolves.toBe('')
    expect(warning).toHaveBeenCalled()
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
      prerelease: true,
      makeLatest: true,
      draft: true,
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

  it('rejects releases without a tag name', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json([{ name: 'Malformed release' }], {}, { 'x-total': '1' }),
    )

    await expect(adapter(fetch).listReleases({ repository })).rejects.toThrow(
      'GitLab release response omitted its tag name',
    )
  })
})
