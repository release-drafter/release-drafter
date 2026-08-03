import type {
  FindChangesRequest,
  Logger,
  Repository,
} from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import {
  createGitHubCompatibleRestAdapter,
  createRestEndpoints,
  type RestForgeProfile,
} from './index.ts'

const repository: Repository = {
  owner: 'octo',
  name: 'project',
  serverUrl: 'https://forge.example',
}
const profile = {
  capabilities: { draftReleases: true },
  apiPath: '/api/v1',
  authHeader: (token: string) => `token ${token}`,
  endpoints: createRestEndpoints(),
  response: {
    comparison: { commits: 'commits', totalCommits: 'total_commits' },
    pagination: {
      pageParameter: 'page',
      limitParameter: 'limit',
      totalCountHeader: 'x-total-count',
    },
    pullRequestList: {
      authorParameter: 'poster',
      stateParameter: 'state',
      closedState: 'closed',
      sortParameter: 'sort',
      oldestSort: 'oldest',
    },
  },
} as const satisfies RestForgeProfile

const json = (
  value: unknown,
  init: ResponseInit = {},
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(value), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...headers },
  })

const commit = (sha: string, date: string, login?: string) => ({
  sha,
  ...(login ? { author: { login } } : {}),
  commit: {
    message: `commit ${sha}`,
    author: { name: `Git ${sha}`, email: `${sha}@example.com`, date },
    committer: { date },
  },
})
const pull = (number: number, overrides: Record<string, unknown> = {}) => ({
  number,
  title: `Pull ${number}`,
  body: `Body ${number}`,
  html_url: `https://forge.example/octo/project/pulls/${number}`,
  merged: true,
  merged_at: `2026-01-${String(number).padStart(2, '0')}T00:00:00Z`,
  merge_commit_sha: `sha-${number}`,
  changed_files: 0,
  user: {
    login: `user-${number}`,
    html_url: `https://forge.example/user-${number}`,
  },
  labels: [{ name: 'feature' }],
  base: { ref: 'main', repo: { full_name: 'octo/project' } },
  head: { ref: `feature-${number}`, repo: { full_name: 'octo/project' } },
  ...overrides,
})

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
  historyLimit: 20,
  includeChangedFiles: false,
  includeNewContributors: false,
  ...overrides,
})

const routeFetch = (
  route: (url: URL, init: RequestInit) => Response | Promise<Response>,
) =>
  vi.fn<typeof fetch>(async (input, init = {}) =>
    route(new URL(String(input)), init),
  )

const createAdapter = (
  fetch: typeof globalThis.fetch,
  options: {
    logger?: Logger
    apiUrl?: string
    limits?: Record<string, number>
    token?: string
  } = {},
) =>
  createGitHubCompatibleRestAdapter(profile, {
    token: options.token ?? 'secret-token',
    fetch,
    apiUrl: options.apiUrl,
    logger: options.logger,
    limits: options.limits,
  })

describe('GitHub-compatible REST mechanics', () => {
  it('uses configured API URLs, explicit authentication, and treats commit-pull 404 as no PR', async () => {
    const fetch = routeFetch((url, init) => {
      expect(url.origin).toBe('https://api.example')
      expect(new Headers(init.headers).get('authorization')).toBe(
        'token secret-token',
      )
      if (url.pathname.includes('/compare/')) {
        expect(url.pathname).toContain('v1...main')
        return json({
          total_commits: 1,
          commits: [commit('a', '2026-01-01T00:00:00Z')],
        })
      }
      return json({ message: 'not found' }, { status: 404 })
    })
    const result = await createAdapter(fetch, {
      apiUrl: 'https://api.example/custom',
    }).findChanges(request())
    expect(result.commits).toHaveLength(1)
    expect(result.pullRequests).toEqual([])
    expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
      'https://api.example/custom/repos/octo/project/compare/v1...main',
      'https://api.example/custom/repos/octo/project/commits/a/pull',
    ])
  })

  it('normalizes independently of comparison response ordering and deduplicates PRs by repository and number', async () => {
    const associated = new Map([
      [
        'a',
        pull(2, { merge_commit_sha: 'a', merged_at: '2026-01-03T00:00:00Z' }),
      ],
      [
        'b',
        pull(2, { merge_commit_sha: 'b', merged_at: '2026-01-03T00:00:00Z' }),
      ],
      [
        'c',
        pull(1, { merge_commit_sha: 'c', merged_at: '2026-01-02T00:00:00Z' }),
      ],
    ])
    const fetch = routeFetch((url) => {
      if (url.pathname.includes('/compare/')) {
        return json({
          total_commits: 3,
          commits: [
            commit('c', '2026-01-03T00:00:00Z'),
            commit('a', '2026-01-01T00:00:00Z'),
            commit('b', '2026-01-02T00:00:00Z'),
          ],
        })
      }
      const sha = /\/commits\/([^/]+)\/pull$/.exec(url.pathname)?.[1]
      return json(associated.get(sha ?? '') ?? {})
    })
    const result = await createAdapter(fetch).findChanges(request())
    expect(result.commits.map(({ oid }) => oid)).toEqual(['a', 'b', 'c'])
    expect(result.pullRequests.map(({ number }) => number)).toEqual([1, 2])
    expect(result.commits[0]?.associatedPullRequests).toEqual([
      { number: 2, baseRepository: 'octo/project' },
    ])
    expect(result.commits[1]?.associatedPullRequests).toEqual([
      { number: 2, baseRepository: 'octo/project' },
    ])
  })

  it.each([
    [{ commits: [commit('a', '2026-01-01T00:00:00Z')] }, 'prove completeness'],
    [
      { total_commits: 2, commits: [commit('a', '2026-01-01T00:00:00Z')] },
      'incomplete or truncated',
    ],
  ])('rejects incomplete comparison payloads', async (comparison, message) => {
    const fetch = routeFetch(() => json(comparison))
    await expect(createAdapter(fetch).findChanges(request())).rejects.toThrow(
      message,
    )
  })

  it('rejects oversized comparison bodies before consuming advertised payloads', async () => {
    const fetch = routeFetch(
      () =>
        new Response('ignored', {
          headers: { 'content-length': '1000' },
        }),
    )
    await expect(
      createAdapter(fetch, { limits: { maxComparisonBytes: 100 } }).findChanges(
        request(),
      ),
    ).rejects.toThrow('100 byte response-size limit')
  })

  it('rejects comparisons above the configured commit-count bound', async () => {
    const fetch = routeFetch(() =>
      json({
        total_commits: 2,
        commits: [
          commit('a', '2026-01-01T00:00:00Z'),
          commit('b', '2026-01-02T00:00:00Z'),
        ],
      }),
    )
    await expect(
      createAdapter(fetch, { limits: { maxComparisonCommits: 1 } }).findChanges(
        request(),
      ),
    ).rejects.toThrow('above the 1 commit limit')
  })

  it('bounds unadvertised streamed response bodies', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(80))
        controller.enqueue(new Uint8Array(80))
        controller.close()
      },
    })
    const fetch = routeFetch(() => new Response(stream))
    await expect(
      createAdapter(fetch, { limits: { maxComparisonBytes: 100 } }).findChanges(
        request(),
      ),
    ).rejects.toThrow('100 byte response-size limit')
  })

  it('keeps timeout active while response bodies are being read', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      const signal = init?.signal
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          signal?.addEventListener('abort', () =>
            controller.error(new DOMException('aborted', 'AbortError')),
          )
        },
      })
      return new Response(stream)
    })
    await expect(
      createAdapter(fetch, { limits: { timeoutMs: 10 } }).findChanges(
        request(),
      ),
    ).rejects.toThrow('timed out after 10ms')
  })

  it('loads changed files through bounded pagination and rejects incomplete file lists', async () => {
    const fetch = routeFetch((url) => {
      if (url.pathname.includes('/compare/')) {
        return json({
          total_commits: 1,
          commits: [commit('a', '2026-01-01T00:00:00Z')],
        })
      }
      if (url.pathname.endsWith('/commits/a/pull')) {
        return json(pull(1, { merge_commit_sha: 'a', changed_files: 3 }))
      }
      if (url.pathname.endsWith('/pulls/1/files')) {
        return url.searchParams.get('page') === '1'
          ? json(
              [{ filename: 'b.ts' }, { filename: 'a.ts' }],
              {},
              { 'x-total-count': '3' },
            )
          : json([{ filename: 'c.ts' }], {}, { 'x-total-count': '3' })
      }
      throw new Error(`Unexpected ${url}`)
    })
    const result = await createAdapter(fetch, {
      limits: { pageSize: 2 },
    }).findChanges(request({ includeChangedFiles: true }))
    expect(result.pullRequests[0]?.changedFiles).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
    ])
  })

  it('rejects pagination that cannot prove completion within its page bound', async () => {
    const fetch = routeFetch(() => json([{ id: 1, tag_name: 'v1' }]))
    await expect(
      createAdapter(fetch, {
        limits: { pageSize: 1, maxPages: 2 },
      }).listReleases({ repository }),
    ).rejects.toThrow('2 page limit')
  })

  it('resolves lightweight and annotated tag refs to commits', async () => {
    const fetch = routeFetch((url) => {
      if (url.pathname.endsWith('/git/commits/lightweight'))
        return json({ sha: 'commit-sha' })
      if (url.pathname.endsWith('/git/commits/annotated'))
        return json({ sha: 'peeled-sha' })
      throw new Error(`Unexpected ${url}`)
    })
    const adapter = createAdapter(fetch)
    await expect(
      adapter.resolveCommitish({
        repository,
        commitish: 'refs/tags/lightweight',
      }),
    ).resolves.toBe('commit-sha')
    await expect(
      adapter.resolveCommitish({
        repository,
        commitish: 'refs/tags/annotated',
      }),
    ).resolves.toBe('peeled-sha')
  })

  it('resolves pull refs and filters associated PRs from another base repository', async () => {
    const fetch = routeFetch((url) => {
      if (url.pathname.includes('/compare/')) {
        return json({
          total_commits: 1,
          commits: [commit('a', '2026-01-01T00:00:00Z')],
        })
      }
      if (url.pathname.endsWith('/commits/a/pull')) {
        return json(
          pull(7, {
            merge_commit_sha: 'a',
            base: { ref: 'main', repo: { full_name: 'other/repo' } },
          }),
        )
      }
      if (url.pathname.endsWith('/pulls/9')) {
        return json({
          head: { sha: 'head-sha' },
          merge_commit_sha: 'merge-sha',
        })
      }
      throw new Error(`Unexpected ${url}`)
    })
    const adapter = createAdapter(fetch)
    const changes = await adapter.findChanges(request())
    expect(changes.pullRequests).toEqual([])
    await expect(
      adapter.resolveCommitish({ repository, commitish: 'refs/pull/9/head' }),
    ).resolves.toBe('head-sha')
    await expect(
      adapter.resolveCommitish({ repository, commitish: 'refs/pull/9/merge' }),
    ).resolves.toBe('merge-sha')
  })

  it('normalizes list/create/update release operations and preserves drafts', async () => {
    const methods: string[] = []
    const bodies: unknown[] = []
    const fetch = routeFetch(async (_url, init) => {
      methods.push(init.method ?? 'GET')
      if (init.body) bodies.push(JSON.parse(String(init.body)))
      if ((init.method ?? 'GET') === 'GET') {
        return json([
          {
            id: 1,
            tag_name: 'v1',
            name: 'One',
            draft: true,
            target_commitish: 'main',
            html_url: 'https://forge.example/release/1',
          },
        ])
      }
      return json(
        {
          id: init.method === 'POST' ? 2 : 1,
          tag_name: 'v2',
          name: 'Two',
          draft: true,
        },
        { status: init.method === 'POST' ? 201 : 200 },
      )
    })
    const adapter = createAdapter(fetch)
    const releases = await adapter.listReleases({ repository })
    expect(releases[0]).toMatchObject({ id: 1, tagName: 'v1', draft: true })
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
      adapter.createRelease({ repository, payload }),
    ).resolves.toMatchObject({
      id: 2,
      tagName: 'v2',
      draft: true,
    })
    const existingRelease = releases[0]
    expect(existingRelease).toBeDefined()
    if (!existingRelease) throw new Error('Expected one release')
    await expect(
      adapter.updateRelease({ repository, release: existingRelease, payload }),
    ).resolves.toMatchObject({ id: 1, tagName: 'v2', draft: true })
    expect(methods).toEqual(['GET', 'POST', 'PATCH'])
    expect(bodies).toEqual([
      {
        body: 'notes',
        draft: true,
        name: 'Two',
        prerelease: false,
        tag_name: 'v2',
        target_commitish: 'main',
      },
      {
        body: 'notes',
        draft: true,
        name: 'Two',
        prerelease: false,
        tag_name: 'v2',
        target_commitish: 'main',
      },
    ])
  })

  it('redacts tokens from transport and HTTP errors', async () => {
    const transport = routeFetch(() => {
      throw new Error('secret-token escaped')
    })
    await expect(
      createAdapter(transport).listReleases({ repository }),
    ).rejects.toThrow('[REDACTED] escaped')

    const http = routeFetch(() =>
      json({ message: 'secret-token rejected' }, { status: 500 }),
    )
    const error = await createAdapter(http)
      .listReleases({ repository })
      .catch((caught: unknown) => caught)
    expect(String(error)).not.toContain('secret-token')
    expect(String(error)).toContain('[REDACTED]')
  })

  it('prefers PR login identity, never invents an email user, and labels new only with bounded proof', async () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    } satisfies Logger
    let bounded = false
    const fetch = routeFetch((url) => {
      if (url.pathname.includes('/compare/')) {
        return json({
          total_commits: 1,
          commits: [commit('a', '2026-01-01T00:00:00Z')],
        })
      }
      if (url.pathname.endsWith('/commits/a/pull')) {
        return json(
          pull(1, {
            merge_commit_sha: 'a',
            merged_at: '2026-01-02T00:00:00Z',
            user: { login: 'pr-user' },
          }),
        )
      }
      if (url.pathname.endsWith('/pulls')) {
        expect(url.searchParams.get('poster')).toBe('pr-user')
        return bounded
          ? json([pull(1)], {}, { 'x-total-count': '100' })
          : json([
              pull(1, {
                user: { login: 'pr-user' },
                merged_at: '2026-01-02T00:00:00Z',
              }),
            ])
      }
      throw new Error(`Unexpected ${url}`)
    })
    const adapter = createAdapter(fetch, { logger })
    const proven = await adapter.findChanges(
      request({ includeNewContributors: true, historyLimit: 2 }),
    )
    expect(proven.newContributorLogins).toEqual(new Set(['pr-user']))
    expect(proven.commits[0]?.authors?.[0]?.login).toBe('pr-user')
    expect(JSON.stringify(proven)).not.toContain('@example.com')

    bounded = true
    const uncertain = await adapter.findChanges(
      request({ includeNewContributors: true, historyLimit: 2 }),
    )
    expect(uncertain.newContributorLogins).toEqual(new Set())
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining('will not be labeled new'),
    )
  })
})
