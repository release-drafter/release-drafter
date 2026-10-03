import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProxyAwareFetch } from './github-fetch.ts'

vi.unmock(import('./github-fetch.ts'))

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

describe('Action GitHub fetch', () => {
  beforeEach(() => {
    undiciMocks.EnvHttpProxyAgent.mockImplementation(
      undiciMocks.MockEnvHttpProxyAgent,
    )
    undiciMocks.fetch.mockReset()
  })

  it.each([
    {
      HTTP_PROXY: 'http://http-proxy.example.com:8080',
      HTTPS_PROXY: 'http://https-proxy.example.com:8080',
      NO_PROXY: 'api.github.com,localhost',
    },
    {
      http_proxy: 'http://http-proxy.example.com:8080',
      https_proxy: 'http://https-proxy.example.com:8080',
      no_proxy: 'api.github.com,localhost',
    },
    {
      HTTP_PROXY: 'http://http-proxy.example.com:8080',
      HTTPS_PROXY: 'http://https-proxy.example.com:8080',
      NO_PROXY: 'api.github.com,localhost',
      http_proxy: 'http://ignored.example.com',
      https_proxy: 'http://ignored.example.com',
      no_proxy: 'ignored.example.com',
    },
  ])('preserves runner proxy and bypass settings: %j', async (env) => {
    const response = Response.json({ default_branch: 'main' })
    undiciMocks.fetch.mockResolvedValueOnce(response)
    const fetch = createProxyAwareFetch(env)
    const dispatcher = undiciMocks.EnvHttpProxyAgent.mock.results.at(-1)?.value
    const url = 'https://api.github.com/repos/release-drafter/release-drafter'
    const init = { headers: { authorization: 'token secret' } }

    await expect(fetch(url, init)).resolves.toBe(response)
    expect(undiciMocks.EnvHttpProxyAgent).toHaveBeenCalledWith({
      httpProxy: 'http://http-proxy.example.com:8080',
      httpsProxy: 'http://https-proxy.example.com:8080',
      noProxy: 'api.github.com,localhost',
    })
    expect(undiciMocks.fetch).toHaveBeenCalledWith(url, {
      ...init,
      dispatcher,
    })
  })
})
