import nock from 'nock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOctokit } from '#src/common/get-octokit.ts'

describe('getOctokit', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_TOKEN', 'test')
  })

  it('retries a transient server failure', async () => {
    const scope = nock('https://api.github.com')
      .get('/repos/release-drafter/release-drafter')
      .reply(500, { message: 'Server Error' })
      .get('/repos/release-drafter/release-drafter')
      .reply(200, { id: 1 })

    const response = await getOctokit().request('GET /repos/{owner}/{repo}', {
      owner: 'release-drafter',
      repo: 'release-drafter',
    })

    expect(response.status).toBe(200)
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
