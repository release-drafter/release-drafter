import { describe, expect, it, vi } from 'vitest'
import { parseCommitishForRelease } from '#src/common/parse-commitish.ts'
import { testGitHubContext } from '#tests/mocks/index.ts'

/**
 * The REST commitish resolvers, used on forges with no GraphQL API.
 *
 * These matter more than their size suggests: resolution failures here are caught
 * and downgraded to an empty `target_commitish`, so a broken resolver produces a
 * release pointing at the default branch rather than an error. That is exactly how
 * the missing REST path went unnoticed before.
 */

const github = (overrides: {
  gitCommit?: () => Promise<unknown>
  pullsGet?: () => Promise<unknown>
}) => {
  const { octokit, logger } = testGitHubContext()
  const request = vi.fn(
    overrides.gitCommit ??
      (async () => {
        throw new Error('unexpected request')
      }),
  )

  return {
    logger,
    request,
    repo: { owner: 'octocat', repo: 'example' },
    restOnly: true,
    octokit: {
      ...octokit,
      request,
      rest: {
        ...octokit.rest,
        pulls: {
          ...octokit.rest.pulls,
          get: vi.fn(
            overrides.pullsGet ??
              (async () => {
                throw new Error('unexpected pulls.get')
              }),
          ),
        },
      },
    } as never,
  }
}

describe('parseCommitishForRelease on REST-only forges', () => {
  it('peels an annotated tag to its commit sha', async () => {
    const context = github({
      gitCommit: async () => ({ data: { sha: 'tag-commit-sha' } }),
    })

    await expect(
      parseCommitishForRelease('refs/tags/v1.2.3', context),
    ).resolves.toBe('tag-commit-sha')
  })

  it('falls back to the default branch when a tag will not resolve', async () => {
    const context = github({
      // No sha means the ref exists but is not a commit.
      gitCommit: async () => ({ data: {} }),
    })

    await expect(
      parseCommitishForRelease('refs/tags/v1.2.3', context),
    ).resolves.toBe('')
    expect(context.logger.warning).toHaveBeenCalledWith(
      expect.stringContaining('could not be resolved to a commit SHA'),
    )
  })

  it.each([
    ['merge', 'refs/pull/7/merge', 'merge-sha'],
    ['head', 'refs/pull/7/head', 'head-sha'],
  ])('resolves a pull request %s ref', async (_label, commitish, expected) => {
    const context = github({
      pullsGet: async () => ({
        data: { merge_commit_sha: 'merge-sha', head: { sha: 'head-sha' } },
      }),
    })

    await expect(parseCommitishForRelease(commitish, context)).resolves.toBe(
      expected,
    )
  })

  it('falls back when a pull request has no such commit', async () => {
    const context = github({
      pullsGet: async () => ({
        data: { merge_commit_sha: null, head: { sha: 'head-sha' } },
      }),
    })

    await expect(
      parseCommitishForRelease('refs/pull/7/merge', context),
    ).resolves.toBe('')
  })

  it('normalizes a branch ref without any request', async () => {
    const context = github({})

    await expect(
      parseCommitishForRelease('refs/heads/main', context),
    ).resolves.toBe('main')
    expect(context.request).not.toHaveBeenCalled()
  })
})
