import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  box: vi.fn(),
  getContent: vi.fn(),
  getOctokit: vi.fn(),
  info: vi.fn(),
  repositoryGet: vi.fn(),
  resolveToken: vi.fn(),
  runReleaseDrafter: vi.fn(),
  start: vi.fn(),
  success: vi.fn(),
}))

vi.mock('consola', () => ({
  consola: {
    box: mocks.box,
    info: mocks.info,
    start: mocks.start,
    success: mocks.success,
  },
}))
vi.mock('#src/common/get-octokit.ts', () => ({
  getOctokit: mocks.getOctokit,
}))
vi.mock('#src/drafter.ts', () => ({
  draftRelease: mocks.runReleaseDrafter,
}))
vi.mock('#src/cli/auth.ts', () => ({ resolveToken: mocks.resolveToken }))

const { draftRelease } = await import('#src/cli/draft-release.ts')

describe('CLI draftRelease', () => {
  const octokit = {
    rest: {
      repos: {
        get: mocks.repositoryGet,
        getContent: mocks.getContent,
      },
    },
  }

  beforeEach(() => {
    mocks.resolveToken.mockResolvedValue('token')
    mocks.getOctokit.mockReturnValue(octokit)
    mocks.repositoryGet.mockResolvedValue({
      data: { default_branch: 'master' },
    })
    mocks.runReleaseDrafter.mockResolvedValue({
      commits: [{}],
      pullRequests: [{}, {}],
      releasePayload: { name: 'v1.0.0' },
      upsertedRelease: undefined,
    })
  })

  it('uses repository defaults and reports a dry run', async () => {
    await draftRelease({
      repository: 'owner/repository',
      config: 'release-drafter.yml',
      dryRun: true,
    })

    expect(mocks.runReleaseDrafter).toHaveBeenCalledWith({
      repo: { owner: 'owner', repo: 'repository' },
      token: 'token',
      octokit,
      configName: 'release-drafter.yml',
      commitish: 'master',
      previousCommitish: undefined,
      version: undefined,
      dryRun: true,
    })
    expect(mocks.start).toHaveBeenCalledWith(
      '🔎 Finding changes since the last release → master',
    )
    expect(mocks.info).toHaveBeenCalledWith(
      '📝 Found 2 pull requests across 1 commits',
    )
    expect(mocks.success).toHaveBeenCalledWith('🧪 Dry run complete for v1.0.0')
  })

  it('passes explicit range, version, and config URL overrides', async () => {
    mocks.getContent
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ data: { type: 'file' } })
    mocks.runReleaseDrafter.mockResolvedValueOnce({
      commits: [],
      pullRequests: [],
      releasePayload: { name: 'v2.0.0' },
      upsertedRelease: {
        data: { html_url: 'https://github.com/owner/repository/releases/1' },
      },
    })

    await draftRelease({
      repository: 'owner/repository',
      from: 'v1.0.0',
      to: 'release/next',
      version: '2.0.0',
      config:
        'https://github.com/owner/.github/blob/feature/shared/.github/release-drafter.yml',
      dryRun: false,
    })

    expect(mocks.runReleaseDrafter).toHaveBeenCalledWith(
      expect.objectContaining({
        configName: 'owner/.github:.github/release-drafter.yml@feature/shared',
        commitish: 'release/next',
        previousCommitish: 'v1.0.0',
        version: '2.0.0',
        dryRun: false,
      }),
    )
    expect(mocks.start).toHaveBeenCalledWith(
      '🔎 Comparing v1.0.0 → release/next',
    )
    expect(mocks.success).toHaveBeenCalledWith(
      '✨ Draft ready: https://github.com/owner/repository/releases/1',
    )
  })
})
