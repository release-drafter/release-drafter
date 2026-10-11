import { describe, expect, it, vi } from 'vite-plus/test'
import { requestUrl } from '../../../src/tests/fetch.ts'
import { GitLabClient } from './gitlab-client.ts'
import { defaultGitLabAdapterLimits } from './types.ts'

const repository = {
  owner: 'owner',
  name: 'repo',
  serverUrl: 'https://gitlab.example',
}

describe('GitLab query parameter serialization', () => {
  it('preserves a string ref in repository file requests', async () => {
    const file = { encoding: 'base64', content: 'dGVtcGxhdGU6IG5vdGVz' }
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json(file),
    )
    const client = new GitLabClient(
      { token: 'token', fetch, defaults: defaultGitLabAdapterLimits },
      repository,
    )

    const result = await client.repositoryFile(
      'owner/repo',
      '.github/release.yml',
      'stable',
      client.budget(),
    )
    expect(result.data).toEqual(file)
    expect(result.status).toBe(200)
    expect(
      fetch.mock.calls.map(([input]) =>
        new URL(requestUrl(input)).searchParams.get('ref'),
      ),
    ).toEqual(['stable'])
  })

  it('rejects an object ref before sending a request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const client = new GitLabClient(
      { token: 'token', fetch, defaults: defaultGitLabAdapterLimits },
      repository,
    )

    await expect(
      client.repositoryFile(
        'owner/repo',
        '.github/release.yml',
        { nested: 'stable' } as unknown as string,
        client.budget(),
      ),
    ).rejects.toThrow(
      'GitLab query parameter "ref" must be a primitive value or array',
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
