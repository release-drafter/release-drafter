import { beforeEach, describe, expect, it, vi } from 'vitest'
import { actionInputSchema } from '#src/actions/drafter/config/index.ts'
import { mocks as sharedMocks, testGitHubContext } from '#tests/mocks/index.ts'

const mocks = vi.hoisted(() => ({
  buildReleasePayload: vi.fn(),
  findPreviousReleases: vi.fn(),
  findPullRequests: vi.fn(),
  upsertRelease: vi.fn(),
}))

vi.mock('#src/actions/drafter/lib/index.ts', () => ({
  buildReleasePayload: mocks.buildReleasePayload,
  findPreviousReleases: mocks.findPreviousReleases,
  findPullRequests: mocks.findPullRequests,
  upsertRelease: mocks.upsertRelease,
}))

const { main } = await import('#src/actions/drafter/main.ts')

const github = testGitHubContext()

describe('drafter main', () => {
  beforeEach(() => {
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

  it('forces pull request merge refs into dry-run mode', async () => {
    const input = actionInputSchema.parse({
      token: 'test',
      publish: 'true',
    })

    const result = await main({
      config: { commitish: 'refs/pull/42/merge' } as never,
      input,
      github,
    })

    expect(result.dryRun).toBe(true)
    expect(mocks.buildReleasePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          'dry-run': true,
          publish: false,
        }),
      }),
    )
    expect(mocks.upsertRelease).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
    )
    expect(sharedMocks.core.warning).toHaveBeenCalledWith(
      'refs/pull/42/merge points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.',
    )
  })

  it('forwards an explicit comparison baseline', async () => {
    const previousCommitish = 'v1.0.0'

    await main({
      config: { commitish: 'main' } as never,
      input: actionInputSchema.parse({ token: 'test' }),
      previousCommitish,
      github,
    })

    expect(mocks.findPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({ previousCommitish }),
    )
    expect(mocks.buildReleasePayload).toHaveBeenCalledWith(
      expect.objectContaining({ previousCommitish }),
    )
  })
})
