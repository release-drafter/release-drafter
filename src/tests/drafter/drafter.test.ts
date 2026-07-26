import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildReleasePayload: vi.fn(),
  findPreviousReleases: vi.fn(),
  findPullRequests: vi.fn(),
  getConfig: vi.fn(),
  mergeInputAndConfig: vi.fn(),
  upsertRelease: vi.fn(),
}))

vi.mock('#src/actions/drafter/config/index.ts', () => ({
  getConfig: mocks.getConfig,
  mergeInputAndConfig: mocks.mergeInputAndConfig,
}))
vi.mock('#src/actions/drafter/lib/index.ts', () => ({
  buildReleasePayload: mocks.buildReleasePayload,
  findPreviousReleases: mocks.findPreviousReleases,
  findPullRequests: mocks.findPullRequests,
  upsertRelease: mocks.upsertRelease,
}))

const { draftRelease } = await import('#src/drafter.ts')

const octokit = {} as never

describe('programmatic draftRelease', () => {
  beforeEach(() => {
    mocks.getConfig.mockResolvedValue({})
    mocks.mergeInputAndConfig.mockReturnValue({ commitish: 'main' })
    mocks.findPreviousReleases.mockResolvedValue({
      draftRelease: undefined,
      lastRelease: undefined,
    })
    mocks.findPullRequests.mockResolvedValue({
      commits: [],
      newContributorLogins: [],
      pullRequests: [],
    })
    mocks.buildReleasePayload.mockResolvedValue({ name: 'v1.0.0' })
    mocks.upsertRelease.mockResolvedValue(undefined)
  })

  it('passes release publication overrides through the action input schema', async () => {
    await draftRelease({
      repo: { owner: 'owner', repo: 'repository' },
      token: 'token',
      octokit,
      commitish: 'main',
      publish: true,
      prerelease: true,
      latest: false,
    })

    expect(mocks.mergeInputAndConfig).toHaveBeenCalledWith(
      expect.objectContaining({
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
