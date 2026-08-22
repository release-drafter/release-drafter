import type {
  GitHubAdapter,
  GitHubAdapterOptions,
} from '@release-drafter/github-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGitHubAdapter } from './github.ts'

describe('Action GitHub adapter composition', () => {
  afterEach(() => vi.unstubAllEnvs())

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
