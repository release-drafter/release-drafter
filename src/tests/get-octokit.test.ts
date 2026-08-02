import nock from 'nock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOctokit } from '#src/common/get-octokit.ts'

describe('getOctokit', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_TOKEN', 'test')
  })

  it('does not retry a transient server failure under Vitest', async () => {
    const scope = nock('https://api.github.com')
      .get('/repos/release-drafter/release-drafter')
      .once()
      .reply(500, { message: 'Server Error' })

    await expect(
      getOctokit().request('GET /repos/{owner}/{repo}', {
        owner: 'release-drafter',
        repo: 'release-drafter',
      }),
    ).rejects.toMatchObject({ status: 500 })
    expect(scope.isDone()).toBe(true)
  })

  it('does not retry an exempt client failure', async () => {
    const scope = nock('https://api.github.com')
      .get('/repos/release-drafter/missing')
      .once()
      .reply(404, { message: 'Not Found' })

    await expect(
      getOctokit().request('GET /repos/{owner}/{repo}', {
        owner: 'release-drafter',
        repo: 'missing',
      }),
    ).rejects.toMatchObject({ status: 404 })
    expect(scope.isDone()).toBe(true)
  })
})
