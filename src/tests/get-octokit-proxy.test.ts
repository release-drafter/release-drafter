import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOctokit } from '#src/common/get-octokit.ts'

// The suite-wide setup swaps in Node's global fetch so nock can intercept.
// These tests assert the real production wiring, so opt out of that.
vi.unmock('@actions/github')

/**
 * `@octokit/core` shallow-merges the `request` option, so passing it at all
 * replaces the proxy-aware `fetch` and agent that `@actions/github` installs
 * from `http_proxy`/`https_proxy`. That breaks GitHub Enterprise Server and
 * corporate-proxy setups, and it fails silently — nothing errors, requests just
 * bypass the proxy.
 *
 * These tests pin the production configuration so a `request: { fetch }`
 * override cannot be reintroduced unnoticed.
 */
const requestDefaults = (octokit: ReturnType<typeof getOctokit>) =>
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
    const { fetch } = requestDefaults(getOctokit())

    expect(fetch).toBeTypeOf('function')
    // The proxy-aware wrapper, not a bare fetch handed straight through.
    expect(fetch).not.toBe(globalThis.fetch)
  })

  it('keeps the proxy agent when a proxy is configured', () => {
    vi.stubEnv('https_proxy', 'http://proxy.invalid:8080')

    expect(requestDefaults(getOctokit()).agent).toBeDefined()
  })
})
