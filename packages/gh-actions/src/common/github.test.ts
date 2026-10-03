import type {
  GitHubAdapter,
  GitHubAdapterOptions,
} from '@release-drafter/github-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGitHubAdapter, getGitHubAdapterOptions } from './github.ts'

vi.unmock(import('./github-fetch.ts'))

describe('Action GitHub adapter composition', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('supplies proxy-aware fetch without changing request defaults', () => {
    vi.stubEnv('VITEST', 'true')
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:8080')

    const options = getGitHubAdapterOptions('action-token')

    expect(options.fetch).toBeTypeOf('function')
    expect(options.fetch).not.toBe(globalThis.fetch)
    expect(options.requestRetries).toBeUndefined()
    expect(options.requestAgent).toBeUndefined()
  })

  it('reuses the adapter for one action token', () => {
    const first = getGitHubAdapter('shared-action-token')
    const second = getGitHubAdapter('shared-action-token')

    expect(second).toBe(first)
  })

  it('creates a new adapter when the action token changes', () => {
    const first = getGitHubAdapter('first-action-token')
    const second = getGitHubAdapter('second-action-token')

    expect(second).not.toBe(first)
  })

  it('passes the explicit token and GHES endpoints to createGitHubAdapter', () => {
    vi.stubEnv('GITHUB_SERVER_URL', 'https://github.example.test')
    vi.stubEnv('GITHUB_API_URL', 'https://github.example.test/api/v3')
    vi.stubEnv('GITHUB_GRAPHQL_URL', 'https://github.example.test/api/graphql')
    const factory = vi.fn(
      (_options: GitHubAdapterOptions) => ({}) as GitHubAdapter,
    )

    getGitHubAdapter('explicit-action-token', undefined, factory)

    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'explicit-action-token',
        serverUrl: 'https://github.example.test',
        apiUrl: 'https://github.example.test/api/v3',
        graphqlUrl: 'https://github.example.test/api/graphql',
      }),
    )
  })
})
