import { describe, expect, it, vi } from 'vitest'
import { ForgejoAdapter } from '../../../../packages/forgejo-adapter/src/index.ts'
import { GiteaAdapter } from '../../../../packages/gitea-adapter/src/index.ts'

const repository = {
  owner: 'owner',
  name: 'repo',
  serverUrl: 'https://forge.example',
}
const release = {
  id: 7,
  tag_name: 'v1',
  name: 'Version 1',
  draft: true,
  target_commitish: 'main',
}
const payload = {
  name: 'Version 2',
  tag: 'v2',
  body: 'notes',
  targetCommitish: 'main',
  draft: true,
  prerelease: false,
  makeLatest: false,
}

describe.each([
  ['Gitea', GiteaAdapter, 'main'],
  ['Forgejo', ForgejoAdapter, 'refs/heads/main'],
] as const)('%s public REST adapter', (_name, Adapter, resolvedBranch) => {
  it('lists, creates, and updates normalized releases with the correct requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      const url = new URL(String(input))
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'token test-token',
      )
      if (!init?.method || init.method === 'GET') {
        expect(url.pathname).toBe('/api/v1/repos/owner/repo/releases')
        return Response.json([release])
      }
      expect(JSON.parse(String(init.body))).toEqual({
        name: payload.name,
        tag_name: payload.tag,
        body: payload.body,
        target_commitish: payload.targetCommitish,
        draft: true,
        prerelease: false,
      })
      if (init.method === 'POST') {
        expect(url.pathname).toBe('/api/v1/repos/owner/repo/releases')
        return Response.json({
          ...release,
          id: 8,
          tag_name: 'v2',
          name: 'Version 2',
        })
      }
      expect(init.method).toBe('PATCH')
      expect(url.pathname).toBe('/api/v1/repos/owner/repo/releases/7')
      return Response.json({ ...release, tag_name: 'v2', name: 'Version 2' })
    })
    const adapter = new Adapter({ token: 'test-token', fetch })
    const [existing] = await adapter.listReleases({ repository })
    expect(existing).toMatchObject({
      id: 7,
      tagName: 'v1',
      name: 'Version 1',
      draft: true,
    })
    await expect(
      adapter.createRelease({ repository, payload }),
    ).resolves.toMatchObject({
      id: 8,
      tagName: 'v2',
      name: 'Version 2',
      draft: true,
    })
    await expect(
      adapter.updateRelease({
        repository,
        release: existing,
        payload,
      }),
    ).resolves.toMatchObject({
      id: 7,
      tagName: 'v2',
      name: 'Version 2',
      draft: true,
    })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('reads default branches, validation data, and base64 configuration through public methods', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const url = new URL(String(input))
      switch (url.pathname) {
        case '/api/v1/repos/owner/repo':
          return Response.json({ default_branch: ' main ' })
        case '/api/v1/repos/owner/repo/pulls/42':
          return Response.json({
            number: 42,
            title: ' Change ',
            base: { ref: ' main ' },
            labels: ['feature', '', { name: 'approved' }, { name: '' }, null],
          })
        case '/api/v1/repos/owner/repo/contents/.github/custom%20config.yml':
          expect(url.searchParams.get('ref')).toBe('stable')
          return Response.json({
            encoding: 'base64',
            content: Buffer.from('template: notes\n').toString('base64'),
          })
        default:
          throw new Error(`Unexpected request: ${url}`)
      }
    })
    const adapter = new Adapter({ token: 'test-token', fetch })
    await expect(adapter.getDefaultBranch(repository)).resolves.toBe('main')
    await expect(
      adapter.getPullRequest({ repository, number: 42 }),
    ).resolves.toEqual({
      number: 42,
      title: 'Change',
      baseRefName: 'main',
      labels: ['feature', 'approved'],
    })
    await expect(
      adapter.getRepositoryConfig({
        repository,
        path: '.github/custom config.yml',
        ref: 'stable',
      }),
    ).resolves.toBe('template: notes\n')
    await expect(
      adapter.resolveCommitish({
        repository,
        commitish: 'refs/heads/main',
      }),
    ).resolves.toBe(resolvedBranch)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
