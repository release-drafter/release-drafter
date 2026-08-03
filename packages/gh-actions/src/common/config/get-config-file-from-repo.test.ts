import type { GitHubAdapter } from '@release-drafter/github-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGitHubAdapter } from '../github.ts'
import { getConfigFileFromRepo } from './get-config-file-from-repo.ts'

vi.mock(import('../github.ts'), () => ({
  getGitHubAdapter: vi.fn(
    () =>
      ({
        getRepositoryConfig: vi.fn().mockResolvedValue('name-template: test'),
      }) as unknown as GitHubAdapter,
  ),
}))

describe('remote Action config authentication', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('uses the explicit input token instead of an ambient token', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'ambient-token')

    await getConfigFileFromRepo(
      {
        scheme: 'github',
        filepath: '.github/release-drafter.yml',
        repo: { owner: 'release-drafter', repo: 'release-drafter' },
      },
      'explicit-input-token',
    )

    expect(getGitHubAdapter).toHaveBeenCalledWith('explicit-input-token')
  })
})
