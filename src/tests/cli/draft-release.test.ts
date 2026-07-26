import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  box: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  getContent: vi.fn(),
  getOctokit: vi.fn(),
  info: vi.fn(),
  repositoryGet: vi.fn(),
  resolveToken: vi.fn(),
  runReleaseDrafter: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('consola', () => ({
  consola: {
    box: mocks.box,
    debug: mocks.debug,
    error: mocks.error,
    info: mocks.info,
    warn: mocks.warning,
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
      releasePayload: {
        name: 'v1.0.0',
        draft: true,
        prerelease: false,
        make_latest: true,
      },
      upsertedRelease: undefined,
      dryRun: true,
    })
  })

  it('uses repository defaults and injects the CLI logger', async () => {
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
      publish: undefined,
      prerelease: undefined,
      latest: undefined,
      logger: {
        debug: expect.any(Function),
        error: expect.any(Function),
        info: expect.any(Function),
        warning: expect.any(Function),
      },
    })
  })

  it('returns the effective dry-run result from shared code', async () => {
    mocks.runReleaseDrafter.mockResolvedValueOnce({
      commits: [],
      pullRequests: [],
      releasePayload: {
        name: 'v1.0.0',
        draft: true,
        prerelease: false,
        make_latest: true,
      },
      upsertedRelease: undefined,
      dryRun: true,
    })

    const result = await draftRelease({
      repository: 'owner/repository',
      config: 'release-drafter.yml',
      dryRun: false,
    })

    expect(result.dryRun).toBe(true)
  })

  it('passes explicit range, version, and config URL overrides', async () => {
    mocks.getContent
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ data: { type: 'file' } })
    mocks.runReleaseDrafter.mockResolvedValueOnce({
      commits: [],
      pullRequests: [],
      releasePayload: {
        name: 'v2.0.0',
        draft: true,
        prerelease: false,
        make_latest: true,
      },
      upsertedRelease: {
        data: { html_url: 'https://github.com/owner/repository/releases/1' },
      },
      dryRun: false,
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
  })

  it.each([
    {
      prerelease: true,
      latest: false,
    },
    {
      prerelease: false,
      latest: true,
    },
    {
      prerelease: false,
      latest: false,
    },
  ])('passes publication options: $prerelease, $latest', async (releaseOptions) => {
    mocks.runReleaseDrafter.mockResolvedValueOnce({
      commits: [],
      pullRequests: [],
      releasePayload: {
        name: 'v2.0.0',
        draft: false,
        prerelease: releaseOptions.prerelease,
        make_latest: releaseOptions.latest,
      },
      upsertedRelease: {
        data: { html_url: 'https://github.com/owner/repository/releases/2' },
      },
      dryRun: false,
    })

    await draftRelease({
      repository: 'owner/repository',
      config: 'release-drafter.yml',
      dryRun: false,
      publish: true,
      prerelease: releaseOptions.prerelease,
      latest: releaseOptions.latest,
    })

    expect(mocks.runReleaseDrafter).toHaveBeenCalledWith(
      expect.objectContaining({
        publish: true,
        prerelease: releaseOptions.prerelease,
        latest: releaseOptions.latest,
      }),
    )
  })
})
