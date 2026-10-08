import { getOctokit } from '@actions/github'
import nock from 'nock'
import { describe, expect, it, vi } from 'vitest'
import {
  ensureReleaseLabels,
  findReleaseCandidate,
} from '#src/scripts/release-candidate.ts'

const repository = 'release-drafter/release-drafter'
const mergeSha = 'a'.repeat(40)
const workflowSha = 'b'.repeat(40)
const options = {
  owner: 'release-drafter',
  repo: 'release-drafter',
  sha: workflowSha,
  version: '7.9.0',
}
const notFound = () => Object.assign(new Error('Not found'), { status: 404 })
const pull = () => ({
  number: 1790,
  merged_at: '2026-10-02T01:26:53Z',
  merge_commit_sha: mergeSha,
  base: { ref: 'main', repo: { full_name: repository } },
  head: { ref: 'release/v7.9.0', repo: { full_name: repository } },
  user: { login: 'release-drafter-releaser[bot]' },
  labels: [{ name: 'autorelease: pending' }],
  title: 'No structured title is required',
  body: 'No structured body is required',
})
const content = (version = '7.9.0') => ({
  data: {
    type: 'file',
    encoding: 'base64',
    content: Buffer.from(JSON.stringify({ version })).toString('base64'),
  },
})

const fixture = (pages = [[pull()]]) => {
  const github = {
    paginate: {
      iterator: vi.fn(() =>
        (async function* () {
          for (const data of pages) yield { data }
        })(),
      ),
    },
    rest: {
      git: { getRef: vi.fn().mockRejectedValue(notFound()) },
      issues: {
        getLabel: vi.fn().mockResolvedValue({}),
        createLabel: vi.fn().mockResolvedValue({}),
      },
      pulls: { list: vi.fn() },
      repos: {
        getReleaseByTag: vi.fn().mockRejectedValue(notFound()),
        compareCommitsWithBasehead: vi
          .fn()
          .mockResolvedValue({ data: { status: 'ahead' } }),
        getContent: vi.fn().mockResolvedValue(content()),
        getCommit: vi
          .fn()
          .mockRejectedValue(
            Object.assign(
              new Error('No commit found for SHA: refs/tags/v7.9.0'),
              { status: 422 },
            ),
          ),
      },
    },
  }
  return {
    github,
    ensureLabels: () =>
      ensureReleaseLabels(
        github as unknown as Parameters<typeof ensureReleaseLabels>[0],
        { owner: options.owner, repo: options.repo },
      ),
    find: (overrides = {}) =>
      findReleaseCandidate(
        github as unknown as Parameters<typeof findReleaseCandidate>[0],
        { ...options, ...overrides },
      ),
  }
}

describe('release candidate discovery', () => {
  it('recovers a pending merged PR on a later push and uses its original merge commit', async () => {
    const { github, find } = fixture()
    await expect(find()).resolves.toEqual({
      number: 1790,
      version: '7.9.0',
      sha: mergeSha,
      major: '7',
      published: false,
    })
    expect(github.paginate.iterator).toHaveBeenCalledWith(
      github.rest.pulls.list,
      expect.objectContaining({ state: 'closed', base: 'main', per_page: 100 }),
    )
    expect(github.rest.repos.compareCommitsWithBasehead).toHaveBeenCalledWith({
      owner: options.owner,
      repo: options.repo,
      basehead: `${mergeSha}...${workflowSha}`,
    })
    for (const path of [
      'package.json',
      'packages/release-drafter/package.json',
    ]) {
      expect(github.rest.repos.getContent).toHaveBeenCalledWith({
        owner: options.owner,
        repo: options.repo,
        path,
        ref: mergeSha,
      })
    }
  })

  it('finds a candidate on a later API page', async () => {
    const { find } = fixture([[], [pull()]])
    await expect(find()).resolves.toMatchObject({ number: 1790 })
  })

  it('recovers an existing draft release', async () => {
    const { github, find } = fixture()
    github.rest.repos.getReleaseByTag.mockResolvedValue({
      data: { draft: true },
    })
    await expect(find()).resolves.toMatchObject({ sha: mergeSha })
  })

  it('can finish tagging a published release if the pending label remains', async () => {
    const { github, find } = fixture()
    github.rest.git.getRef.mockResolvedValue({
      data: { ref: 'refs/tags/v7.9.0' },
    })
    github.rest.repos.getReleaseByTag.mockResolvedValue({
      data: { draft: false },
    })
    github.rest.repos.getCommit.mockResolvedValue({ data: { sha: mergeSha } })
    await expect(find()).resolves.toMatchObject({
      published: true,
      sha: mergeSha,
      major: '7',
    })
  })

  it('rejects a published release whose tag is missing', async () => {
    const { github, find } = fixture()
    github.rest.repos.getReleaseByTag.mockResolvedValue({
      data: { draft: false },
    })
    await expect(find()).rejects.toThrow('has no version tag')
  })

  it.each([
    { merged_at: null },
    { base: { ref: 'other', repo: { full_name: repository } } },
    { base: { ref: 'main', repo: { full_name: 'other/repo' } } },
    { head: { ref: 'release/v7.9.0', repo: { full_name: 'other/repo' } } },
    { head: { ref: 'release/v7.9.0', repo: null } },
    { head: { ref: 'release/v7.8.0', repo: { full_name: repository } } },
    { user: { login: 'other[bot]' } },
    { labels: [{ name: 'autorelease: tagged' }] },
    { labels: [] },
  ])('skips an ineligible PR: %j', async (overrides) => {
    const { github, find } = fixture([
      [{ ...pull(), ...overrides } as ReturnType<typeof pull>],
    ])
    await expect(find()).resolves.toBeUndefined()
    expect(github.rest.repos.getReleaseByTag).not.toHaveBeenCalled()
  })

  it.each(['', 'not-a-sha'])(
    'rejects an invalid merge SHA: %s',
    async (sha) => {
      const { find } = fixture([[{ ...pull(), merge_commit_sha: sha }]])
      await expect(find()).rejects.toThrow('no valid merge commit')
    },
  )

  it.each(['behind', 'diverged'])(
    'rejects a merge commit outside the workflow history: %s',
    async (status) => {
      const { github, find } = fixture()
      github.rest.repos.compareCommitsWithBasehead.mockResolvedValue({
        data: { status },
      })
      await expect(find()).rejects.toThrow('not an ancestor')
    },
  )

  it('accepts the release merge commit itself as the workflow commit', async () => {
    const { github, find } = fixture()
    github.rest.repos.compareCommitsWithBasehead.mockResolvedValue({
      data: { status: 'identical' },
    })
    await expect(find({ sha: mergeSha })).resolves.toMatchObject({
      sha: mergeSha,
    })
  })

  it.each([0, 1])(
    'rejects a version mismatch in manifest %s',
    async (index) => {
      const { github, find } = fixture()
      if (index === 1)
        github.rest.repos.getContent.mockResolvedValueOnce(content())
      github.rest.repos.getContent.mockResolvedValueOnce(content('7.8.0'))
      await expect(find()).rejects.toThrow('unexpected version')
    },
  )

  it.each([
    [],
    { type: 'dir' },
    { type: 'file', encoding: 'none', content: '' },
  ])('rejects unreadable manifest data: %j', async (data) => {
    const { github, find } = fixture()
    github.rest.repos.getContent.mockResolvedValue({ data } as ReturnType<
      typeof content
    >)
    await expect(find()).rejects.toThrow('no readable package.json')
  })

  it('accepts an existing version tag at the intended merge commit', async () => {
    const { github, find } = fixture()
    github.rest.git.getRef.mockResolvedValue({
      data: { ref: 'refs/tags/v7.9.0' },
    })
    github.rest.repos.getCommit.mockResolvedValue({ data: { sha: mergeSha } })
    await expect(find()).resolves.toMatchObject({ sha: mergeSha })
    expect(github.rest.repos.getCommit).toHaveBeenCalledWith({
      owner: options.owner,
      repo: options.repo,
      ref: 'refs/tags/v7.9.0',
    })
  })

  it('rejects an existing version tag at a different commit', async () => {
    const { github, find } = fixture()
    github.rest.git.getRef.mockResolvedValue({
      data: { ref: 'refs/tags/v7.9.0' },
    })
    github.rest.repos.getCommit.mockResolvedValue({
      data: { sha: workflowSha },
    })
    await expect(find()).rejects.toThrow('points to a different commit')
  })

  it.each(['getReleaseByTag', 'getCommit'] as const)(
    'does not treat %s authorization failures as a missing release or tag',
    async (method) => {
      const { github, find } = fixture()
      if (method === 'getCommit')
        github.rest.git.getRef.mockResolvedValue({
          data: { ref: 'refs/tags/v7.9.0' },
        })
      github.rest.repos[method].mockRejectedValue(
        Object.assign(new Error('Forbidden'), { status: 403 }),
      )
      await expect(find()).rejects.toThrow('Forbidden')
    },
  )

  it.each(['7.9.0-beta.1', '07.9.0', '7.9', '7.9.0/other'])(
    'rejects an invalid stable version: %s',
    async (version) => {
      const { github, find } = fixture()
      await expect(find({ version })).rejects.toThrow(
        'Invalid stable release version',
      )
      expect(github.paginate.iterator).not.toHaveBeenCalled()
    },
  )

  it('accepts a missing tag without calling the commit endpoint that returns 422', async () => {
    const { github, find } = fixture()
    await expect(find()).resolves.toMatchObject({
      published: false,
      sha: mergeSha,
    })
    expect(github.rest.git.getRef).toHaveBeenCalledWith({
      owner: options.owner,
      repo: options.repo,
      ref: 'tags/v7.9.0',
    })
    expect(github.rest.repos.getCommit).not.toHaveBeenCalled()
  })

  it('propagates reference lookup errors other than a missing tag', async () => {
    const { github, find } = fixture()
    github.rest.git.getRef.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    )
    await expect(find()).rejects.toThrow('Forbidden')
  })

  it('does not ignore a commit resolution failure for an existing tag', async () => {
    const { github, find } = fixture()
    github.rest.git.getRef.mockResolvedValue({
      data: { ref: 'refs/tags/v7.9.0' },
    })
    await expect(find()).rejects.toThrow('No commit found for SHA')
  })
})

describe('GitHub release discovery HTTP contract', () => {
  it.each(['missing', 'annotated'] as const)(
    'handles a %s tag through the real Octokit client',
    async (tagState) => {
      const scope = nock('https://api.github.com')
        .get(`/repos/${repository}/pulls`)
        .query({
          state: 'closed',
          base: 'main',
          per_page: 100,
          sort: 'updated',
          direction: 'desc',
        })
        .reply(200, [pull()])
        .get(`/repos/${repository}/releases/tags/v7.9.0`)
        .reply(404, { message: 'Not Found' })
        .get(`/repos/${repository}/compare/${mergeSha}...${workflowSha}`)
        .reply(200, { status: 'ahead' })
        .get(`/repos/${repository}/contents/package.json`)
        .query({ ref: mergeSha })
        .reply(200, content().data)
        .get(
          `/repos/${repository}/contents/packages%2Frelease-drafter%2Fpackage.json`,
        )
        .query({ ref: mergeSha })
        .reply(200, content().data)
        .get(
          new RegExp(`/repos/${repository}/git/ref/tags(?:%2F|/)v7\\.9\\.0$`),
        )
        .reply(
          tagState === 'missing' ? 404 : 200,
          tagState === 'missing'
            ? { message: 'Not Found' }
            : {
                ref: 'refs/tags/v7.9.0',
                object: { type: 'tag', sha: 'c'.repeat(40) },
              },
        )

      if (tagState === 'annotated') {
        scope
          .get(`/repos/${repository}/commits/refs%2Ftags%2Fv7.9.0`)
          .reply(200, { sha: mergeSha })
      } else {
        scope
          .get(`/repos/${repository}/commits/refs%2Ftags%2Fv7.9.0`)
          .optionally()
          .reply(422, { message: 'No commit found for SHA: refs/tags/v7.9.0' })
      }

      await expect(
        findReleaseCandidate(
          getOctokit('test', { request: { fetch: globalThis.fetch } }),
          options,
        ),
      ).resolves.toMatchObject({ sha: mergeSha, published: false })
      expect(scope.isDone()).toBe(true)
    },
  )
})

describe('release label setup', () => {
  it('leaves existing labels unchanged', async () => {
    const { github, ensureLabels } = fixture()
    await ensureLabels()
    expect(github.rest.issues.getLabel).toHaveBeenCalledTimes(3)
    expect(github.rest.issues.createLabel).not.toHaveBeenCalled()
  })

  it('creates missing release state and changelog exclusion labels', async () => {
    const { github, ensureLabels } = fixture()
    github.rest.issues.getLabel.mockRejectedValue(notFound())
    await ensureLabels()
    expect(github.rest.issues.createLabel).toHaveBeenCalledTimes(3)
    for (const name of [
      'autorelease: pending',
      'autorelease: tagged',
      'skip-changelog',
    ]) {
      expect(github.rest.issues.createLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: options.owner,
          repo: options.repo,
          name,
        }),
      )
    }
  })

  it('does not treat an authorization error as a missing label', async () => {
    const { github, ensureLabels } = fixture()
    github.rest.issues.getLabel.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    )
    await expect(ensureLabels()).rejects.toThrow('Forbidden')
    expect(github.rest.issues.createLabel).not.toHaveBeenCalled()
  })

  it('accepts a label created by a concurrent workflow', async () => {
    const { github, ensureLabels } = fixture()
    github.rest.issues.getLabel.mockRejectedValueOnce(notFound())
    github.rest.issues.createLabel.mockRejectedValueOnce(
      Object.assign(new Error('Already exists'), { status: 422 }),
    )
    await expect(ensureLabels()).resolves.toBeUndefined()
    expect(github.rest.issues.getLabel).toHaveBeenCalledTimes(4)
  })

  it('propagates failed label creation', async () => {
    const { github, ensureLabels } = fixture()
    github.rest.issues.getLabel.mockRejectedValueOnce(notFound())
    github.rest.issues.createLabel.mockRejectedValueOnce(
      Object.assign(new Error('Unavailable'), { status: 503 }),
    )
    await expect(ensureLabels()).rejects.toThrow('Unavailable')
  })
})
