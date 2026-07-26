import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getActionOctokit } from '#src/actions/get-octokit.ts'

// The suite-wide setup swaps in Node's global fetch so nock can intercept.
// These tests assert the real production wiring, so opt out of that.
vi.unmock('@actions/github')

/**
 * `@octokit/core` shallow-merges the `request` option, so passing it at all
 * replaces the proxy-aware `fetch` and agent that `@actions/github` installs
 * from `http_proxy`/`https_proxy`. That silently breaks GitHub Enterprise
 * Server and corporate proxies, so pin the production configuration here.
 */
const requestDefaults = (octokit: ReturnType<typeof getActionOctokit>) =>
  (
    octokit.request as unknown as {
      endpoint: {
        DEFAULTS: { request: { fetch?: unknown; agent?: unknown } }
      }
    }
  ).endpoint.DEFAULTS.request

describe('getOctokit proxy support', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_TOKEN', 'test')
  })

  it("keeps @actions/github's proxy-aware fetch rather than replacing it", () => {
    const { fetch } = requestDefaults(getActionOctokit('test'))

    expect(fetch).toBeTypeOf('function')
    // The proxy-aware wrapper, not a bare fetch handed straight through.
    expect(fetch).not.toBe(globalThis.fetch)
  })

  it('keeps the proxy agent when a proxy is configured', () => {
    vi.stubEnv('https_proxy', 'http://proxy.invalid:8080')

    expect(requestDefaults(getActionOctokit('test')).agent).toBeDefined()
  })
})
