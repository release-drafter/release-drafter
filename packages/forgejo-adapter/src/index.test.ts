import type { Repository } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import { ForgejoAdapter, forgejoProfile } from './index.ts'

const repository: Repository = {
  owner: 'owner',
  name: 'repo',
  serverUrl: 'https://forgejo.example',
}

describe('Forgejo profile', () => {
  it('is an explicit draft-capable ForgeAdapter profile with Forgejo endpoints and auth', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      expect(String(input)).toBe(
        'https://forgejo.example/api/v1/repos/owner/repo/compare/v1...main',
      )
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'token forgejo-token',
      )
      return new Response(JSON.stringify({ total_commits: 0, commits: [] }))
    })
    const adapter = new ForgejoAdapter({ token: 'forgejo-token', fetch })
    expect(adapter.capabilities).toEqual({ draftReleases: true })
    expect(forgejoProfile.response.pullRequestList.authorParameter).toBe(
      'poster',
    )
    await expect(
      adapter.findChanges({
        repository,
        comparison: { baseRef: 'v1', headRef: 'main' },
        pullRequestFields: {
          body: false,
          url: false,
          baseRefName: false,
          headRefName: false,
        },
        pullRequestLimit: 5,
        historyLimit: 100,
        includeChangedFiles: false,
        includeNewContributors: false,
      }),
    ).resolves.toEqual({
      commits: [],
      pullRequests: [],
      newContributorLogins: new Set(),
    })
  })
})
