import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  box: vi.fn(),
  createConsola: vi.fn(),
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

vi.mock('consola', () => {
  const consola = {
    box: mocks.box,
    debug: mocks.debug,
    error: mocks.error,
    info: mocks.info,
    warn: mocks.warning,
  }
  mocks.createConsola.mockReturnValue(consola)

  return {
    consola,
    createConsola: mocks.createConsola,
  }
})
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
    vi.clearAllMocks()
    mocks.createConsola.mockReturnValue({
      box: mocks.box,
      debug: mocks.debug,
      error: mocks.error,
      info: mocks.info,
      warn: mocks.warning,
    })
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
        tag: 'v1.0.0',
        body: 'Release notes',
        draft: true,
        prerelease: false,
        make_latest: true,
        targetCommitish: 'abc123',
        resolvedVersion: '1.0.0',
        majorVersion: '1',
        minorVersion: '0',
        patchVersion: '0',
      },
      upsertedRelease: undefined,
      dryRun: true,
      previousCommitish: 'v0.9.0',
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

  it('writes action-compatible JSON while preserving logs on stderr', async () => {
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true)

    try {
      await draftRelease({
        repository: 'owner/repository',
        config: 'release-drafter.yml',
        dryRun: true,
        json: true,
      })

      const { logger } = mocks.runReleaseDrafter.mock.calls[0][0]
      logger.info('hidden')

      expect(mocks.createConsola).toHaveBeenCalledWith({
        stdout: process.stderr,
        stderr: process.stderr,
      })
      expect(mocks.box).toHaveBeenCalledWith(
        '✍️ Release Drafter\nowner/repository',
      )
      expect(mocks.info).toHaveBeenCalledWith('hidden')
      expect(stdout).toHaveBeenCalledWith(
        `${JSON.stringify(
          {
            tag_name: 'v1.0.0',
            target_commitish: 'abc123',
            previous_commitish: 'v0.9.0',
            draft: true,
            prerelease: false,
            latest: true,
            dry_run: true,
            name: 'v1.0.0',
            resolved_version: '1.0.0',
            major_version: '1',
            minor_version: '0',
            patch_version: '0',
            body: 'Release notes',
          },
          null,
          2,
        )}\n`,
      )
    } finally {
      stdout.mockRestore()
    }
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
