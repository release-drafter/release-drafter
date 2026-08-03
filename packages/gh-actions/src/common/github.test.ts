import type {
  GitHubAdapter,
  GitHubAdapterOptions,
} from '@release-drafter/github-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGitHubAdapter } from './github.ts'

describe('Action GitHub adapter composition', () => {
  afterEach(() => vi.unstubAllEnvs())

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
