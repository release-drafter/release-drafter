import { describe, expect, it, vi } from 'vitest'
import { resolveRestOnly } from '#src/common/resolve-api-mode.ts'

/** Keeps an ambient `GITHUB_GRAPHQL_URL` from leaking into URL-only cases. */
const noEnvironment = { graphqlUrl: null } as const

describe('resolveRestOnly', () => {
  it('honours an explicit choice over everything else', () => {
    expect(
      resolveRestOnly({
        explicit: true,
        apiUrl: 'https://api.github.com',
        graphqlUrl: 'https://api.github.com/graphql',
      }),
    ).toBe(true)
    expect(
      resolveRestOnly({
        explicit: false,
        apiUrl: 'https://gitea.example.com/api/v1',
        graphqlUrl: '',
      }),
    ).toBe(false)
  })

  it.each([
    ['unset', undefined],
    ['github.com', 'https://api.github.com'],
    ['a trailing slash', 'https://api.github.com/'],
    ['GitHub Enterprise Server', 'https://github.example.com/api/v3'],
  ])('keeps GraphQL for %s', (_label, apiUrl) => {
    expect(resolveRestOnly({ apiUrl, ...noEnvironment })).toBe(false)
  })

  it.each([
    ['Gitea', 'http://gitea.example.com/api/v1'],
    ['Forgejo on a subpath', 'https://example.com/forgejo/api/v1'],
    ['a trailing slash', 'http://localhost:3000/api/v1/'],
  ])('selects REST for %s', (_label, apiUrl) => {
    expect(resolveRestOnly({ apiUrl, ...noEnvironment })).toBe(true)
  })

  it('falls back to the environment when the API URL says nothing', () => {
    // Gitea and Forgejo runners send this empty; GitHub populates it.
    expect(resolveRestOnly({ graphqlUrl: '' })).toBe(true)
    expect(resolveRestOnly({ graphqlUrl: '   ' })).toBe(true)
    expect(
      resolveRestOnly({ graphqlUrl: 'https://api.github.com/graphql' }),
    ).toBe(false)
  })

  it('reads GITHUB_GRAPHQL_URL when no value is passed', () => {
    vi.stubEnv('GITHUB_GRAPHQL_URL', '')
    expect(resolveRestOnly()).toBe(true)

    vi.stubEnv('GITHUB_GRAPHQL_URL', 'https://api.github.com/graphql')
    expect(resolveRestOnly()).toBe(false)
  })

  it('lets the API URL win over a conflicting environment', () => {
    // Running inside a Gitea job against github.com: the environment describes
    // the host, the API URL describes the target, and the target decides.
    vi.stubEnv('GITHUB_GRAPHQL_URL', '')

    expect(resolveRestOnly({ apiUrl: 'https://api.github.com' })).toBe(false)
    expect(
      resolveRestOnly({ apiUrl: 'https://gitea.example.com/api/v1' }),
    ).toBe(true)
  })

  it('assumes GraphQL when nothing is knowable', () => {
    expect(resolveRestOnly({ ...noEnvironment })).toBe(false)
    // An unparseable URL must not be read as a forge signal.
    expect(resolveRestOnly({ apiUrl: 'not a url', ...noEnvironment })).toBe(
      false,
    )
  })
})
