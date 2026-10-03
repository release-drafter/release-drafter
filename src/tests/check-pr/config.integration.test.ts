import * as core from '@actions/core'
import nock from 'nock'
import { describe, expect, it, vi } from 'vitest'
import { getConfig } from '#gh-actions/check-pr/get-config.ts'
import { checkPullRequest } from '#gh-actions/check-pr/runner.ts'

// Exercise the real composition and GitHub API reads, rather than config fixtures.
vi.unmock(import('#gh-actions/common/config/index.ts'))

const request = (eventName: string) => ({
  eventName,
  payload: {
    action: 'synchronize',
    number: 42,
    pull_request: {
      title: 'feat: change',
      labels: [],
      base: { ref: 'main' },
      head: { ref: 'feature', repo: { full_name: 'contributor/fork' } },
    },
  },
  getInput: () => ({ 'config-name': 'release-drafter.yml', token: 'test' }),
  getConfig,
})
const validConfig =
  'categories:\n  - title: Features\n    when:\n      conventional:\n        type: feat\n'

const configResponse = (path: string, ref: string, content: string) =>
  nock('https://api.github.com')
    .get(
      `/repos/acme/widgets/contents/${encodeURIComponent(`.github/${path}`)}`,
    )
    .query({ ref })
    .reply(200, content, { 'content-type': 'text/plain' })

describe('check-pr repository config snapshots', () => {
  it.each(['pull_request', 'pull_request_target'])(
    'reads both snapshots and inherited files for a fork on %s without checkout',
    async (eventName) => {
      vi.stubEnv('GITHUB_REPOSITORY', 'acme/widgets')
      const scopes = ['main', 'refs/pull/42/head'].flatMap((ref) => [
        configResponse('release-drafter.yml', ref, '_extends: base.yml\n'),
        configResponse('base.yml', ref, validConfig),
      ])
      await checkPullRequest(request(eventName))
      expect(scopes.every((scope) => scope.isDone())).toBe(true)
      expect(core.error).not.toHaveBeenCalled()
    },
  )

  it('reports proposed YAML errors with the file, line and PR ref', async () => {
    vi.stubEnv('GITHUB_REPOSITORY', 'acme/widgets')
    const base = configResponse('release-drafter.yml', 'main', validConfig)
    const proposed = configResponse(
      'release-drafter.yml',
      'refs/pull/42/head',
      'categories: [\n',
    )
    await expect(checkPullRequest(request('pull_request'))).rejects.toThrow(
      'Proposed configuration',
    )
    expect(base.isDone() && proposed.isDone()).toBe(true)
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('acme/widgets@refs/pull/42/head'),
      expect.objectContaining({
        file: '.github/release-drafter.yml',
        startLine: 2,
      }),
    )
    expect(core.setOutput).not.toHaveBeenCalled()
  })
  it('keeps external configuration errors off local files and honors pinned refs', async () => {
    vi.stubEnv('GITHUB_REPOSITORY', 'acme/widgets')
    const external = nock('https://api.github.com')
      .get('/repos/acme/shared/contents/.github%2Frelease-drafter.yml')
      .query({ ref: 'v1' })
      .twice()
      .reply(200, 'categories: [\n', { 'content-type': 'text/plain' })
    const value = request('pull_request_target')
    value.getInput = () => ({
      'config-name': 'acme/shared:release-drafter.yml@v1',
      token: 'test',
    })
    await expect(checkPullRequest(value)).rejects.toThrow('acme/shared@v1')
    expect(external.isDone()).toBe(true)
    expect(core.error).toHaveBeenCalledTimes(2)
    for (const [, annotation] of vi.mocked(core.error).mock.calls) {
      expect(annotation?.file).toBeUndefined()
      expect(annotation?.startLine).toBeUndefined()
    }
  })
})
