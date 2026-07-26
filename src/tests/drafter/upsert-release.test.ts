import { beforeEach, describe, expect, it, vi } from 'vitest'
import { upsertRelease } from '#src/actions/drafter/lib/upsert-release/upsert-release.ts'
import type { Logger } from '#src/common/logger.ts'
import { testGitHubContext } from '#tests/mocks/context.ts'

const logger: Logger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}

const createRelease = vi.fn()
const updateRelease = vi.fn()
const github = testGitHubContext({
  logger,
  octokit: {
    rest: {
      repos: {
        createRelease,
        updateRelease,
      },
    },
  } as never,
})
const releasePayload = {
  body: 'Release notes',
  draft: true,
  make_latest: true,
  name: 'v1.0.0',
  prerelease: false,
  tag: 'v1.0.0',
  targetCommitish: 'main',
} as never

describe('upsertRelease logging', () => {
  beforeEach(() => {
    createRelease.mockResolvedValue({
      data: { html_url: 'https://github.com/owner/repository/releases/1' },
    })
    updateRelease.mockResolvedValue({
      data: { html_url: 'https://github.com/owner/repository/releases/2' },
    })
  })

  it('reports the URL after creating a release', async () => {
    await upsertRelease({
      draftRelease: undefined,
      releasePayload,
      github,
    })

    expect(logger.info).toHaveBeenCalledWith(
      '🎉 Release created: https://github.com/owner/repository/releases/1',
    )
  })

  it('reports the URL after updating a release', async () => {
    await upsertRelease({
      draftRelease: { id: 1 } as never,
      releasePayload,
      github,
    })

    expect(logger.info).toHaveBeenCalledWith(
      '🎉 Release updated: https://github.com/owner/repository/releases/2',
    )
  })
})
