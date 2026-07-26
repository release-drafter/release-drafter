import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  main: vi.fn(),
  mergeInputAndConfig: vi.fn(),
}))

vi.mock('#src/actions/drafter/config/index.ts', () => ({
  getConfig: mocks.getConfig,
  mergeInputAndConfig: mocks.mergeInputAndConfig,
}))
vi.mock('#src/actions/drafter/main.ts', () => ({
  main: mocks.main,
}))

const { draftRelease } = await import('#src/drafter.ts')

const octokit = {} as never

describe('programmatic draftRelease', () => {
  beforeEach(() => {
    mocks.getConfig.mockResolvedValue({})
    mocks.mergeInputAndConfig.mockReturnValue({ commitish: 'main' })
    mocks.main.mockResolvedValue({
      commits: [],
      pullRequests: [],
      releasePayload: { name: 'v1.0.0' },
      upsertedRelease: undefined,
      dryRun: false,
    })
  })

  it('passes release publication overrides through the action input schema', async () => {
    await draftRelease({
      repo: { owner: 'owner', repo: 'repository' },
      token: 'token',
      octokit,
      commitish: 'main',
      previousCommitish: 'v1.0.0',
      publish: true,
      prerelease: true,
      latest: false,
    })

    expect(mocks.main).toHaveBeenCalledWith(
      expect.objectContaining({
        previousCommitish: 'v1.0.0',
        input: expect.objectContaining({
          publish: true,
          prerelease: true,
          latest: false,
        }),
      }),
    )
  })

  it('preserves config values when publication overrides are omitted', async () => {
    await draftRelease({
      repo: { owner: 'owner', repo: 'repository' },
      token: 'token',
      octokit,
      commitish: 'main',
    })

    expect(mocks.mergeInputAndConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          publish: false,
          prerelease: undefined,
          latest: undefined,
        }),
      }),
    )
  })
})
