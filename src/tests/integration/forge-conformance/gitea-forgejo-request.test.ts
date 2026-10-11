import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { forgeApi } from './gitea-forgejo-container.ts'

afterEach(() => vi.unstubAllGlobals())

const fixture = { apiUrl: 'https://forge.example/api', token: 'fixture-token' }
const customHeaders = {
  accept: 'text/plain',
  authorization: 'custom-token',
  'content-type': 'custom-content',
  'x-check': 'passed',
}

describe('forge fixture request headers', () => {
  it.each([
    { kind: 'record', headers: customHeaders },
    { kind: 'pairs', headers: Object.entries(customHeaders) },
    { kind: 'Headers', headers: new Headers(customHeaders) },
  ])('preserves caller overrides supplied as $kind', async ({ headers }) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ ok: true }),
    )
    vi.stubGlobal('fetch', fetch)

    await expect(
      forgeApi(fixture, '/releases', { method: 'POST', body: '{}', headers }),
    ).resolves.toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledOnce()
    expect(
      Object.fromEntries(new Headers(fetch.mock.calls[0]?.[1]?.headers)),
    ).toEqual(customHeaders)
  })

  it('adds authentication and JSON defaults when no headers are supplied', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ ok: true }),
    )
    vi.stubGlobal('fetch', fetch)

    await expect(
      forgeApi(fixture, '/releases', { method: 'POST', body: '{}' }),
    ).resolves.toEqual({ ok: true })
    expect(
      Object.fromEntries(new Headers(fetch.mock.calls[0]?.[1]?.headers)),
    ).toEqual({
      accept: 'application/json',
      authorization: 'token fixture-token',
      'content-type': 'application/json',
    })
  })
})
