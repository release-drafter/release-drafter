import type { Repository } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import { GiteaAdapter, giteaProfile } from './index.ts'

const repository: Repository = {
  owner: 'owner',
  name: 'repo',
  serverUrl: 'https://gitea.example',
}

describe('Gitea profile', () => {
  it('is an explicit draft-capable ForgeAdapter profile with Gitea endpoints and auth', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      expect(String(input)).toBe(
        'https://gitea.example/api/v1/repos/owner/repo/compare/v1...main',
      )
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'token gitea-token',
      )
      return new Response(JSON.stringify({ total_commits: 0, commits: [] }))
    })
    const adapter = new GiteaAdapter({ token: 'gitea-token', fetch })
    expect(adapter.capabilities).toEqual({ draftReleases: true })
    expect(giteaProfile.qualifiedRefMode).toBe('normalize')
    expect(giteaProfile.response.pullRequestList.authorParameter).toBe('poster')
    expect({
      commitPull: giteaProfile.endpoints.commitPull(repository, 'a/b'),
      pullFiles: giteaProfile.endpoints.pullFiles(repository, 7),
      pulls: giteaProfile.endpoints.pulls(repository),
      gitCommit: giteaProfile.endpoints.gitCommit(repository, 'refs/tags/v1'),
      pull: giteaProfile.endpoints.pull(repository, 7),
      releases: giteaProfile.endpoints.releases(repository),
      release: giteaProfile.endpoints.release(repository, 9),
    }).toEqual({
      commitPull: '/repos/owner/repo/commits/a%2Fb/pull',
      pullFiles: '/repos/owner/repo/pulls/7/files',
      pulls: '/repos/owner/repo/pulls',
      gitCommit: '/repos/owner/repo/git/commits/refs%2Ftags%2Fv1',
      pull: '/repos/owner/repo/pulls/7',
      releases: '/repos/owner/repo/releases',
      release: '/repos/owner/repo/releases/9',
    })
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
