import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findPreviousReleases } from '#src/actions/drafter/lib/index.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { mockContext, mocks as sharedMocks } from '../mocks/index.ts'

const localMocks = vi.hoisted(() => {
  return {
    releases: vi.fn<Octokit['paginate']>(),
  }
})

vi.mock(import('#src/common/get-octokit.ts'), async (iom) => {
  const om = await iom()
  process.env.GITHUB_TOKEN = 'test'
  return {
    ...om,
    getOctokit: () => ({
      ...om.getOctokit(),
      paginate: localMocks.releases as unknown as Octokit['paginate'],
    }),
  }
})

describe('find previous releases', () => {
  beforeEach(async () => {
    await mockContext('push')
  })

  it('should retrieve last release respecting semver, stripped prefix', async () => {
    localMocks.releases.mockResolvedValueOnce([
      {
        tag_name: 'test-1.0.1',
        target_commitish: 'master',
        created_at: '2021-06-29T05:45:15Z',
      },
      {
        tag_name: 'test-1.0.0',
        target_commitish: 'master',
        created_at: '2022-06-29T05:45:15Z',
      },
    ])

    const { lastRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': 'test-',
      prerelease: false,
    })

    expect(lastRelease?.tag_name).toEqual('test-1.0.1')
  })

  it('should return last release without draft and prerelease', async () => {
    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true },
    ])

    const { lastRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      prerelease: false,
    })

    expect(lastRelease).toEqual({
      tag_name: 'v1.0.1',
      draft: false,
      prerelease: false,
    })
  })

  it('should return non-prerelease draft when isPreRelease is false', async () => {
    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true },
    ])

    const { draftRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      prerelease: false,
    })

    expect(draftRelease).toEqual({
      tag_name: 'v1.0.0',
      draft: true,
      prerelease: false,
    })
  })

  it('should skip prerelease draft when isPreRelease is false', async () => {
    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.2-rc.1', draft: true, prerelease: true },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
    ])

    const { draftRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      prerelease: false,
    })

    expect(draftRelease).toBeUndefined()
  })

  it('should return prerelease draft when isPreRelease is true', async () => {
    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: true, prerelease: true },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
    ])

    const { draftRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      prerelease: true,
    })

    expect(draftRelease).toEqual({
      tag_name: 'v1.0.2-rc.1',
      draft: true,
      prerelease: true,
    })
  })

  it('should prefer matching draft when both types exist', async () => {
    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: true, prerelease: true },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
    ])

    const { draftRelease: preDraft } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      prerelease: true,
      'tag-prefix': '',
      'filter-by-commitish': false,
    })

    expect(preDraft).toEqual({
      tag_name: 'v1.0.2-rc.1',
      draft: true,
      prerelease: true,
    })

    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: true, prerelease: true },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
    ])

    const { draftRelease: stableDraft } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      prerelease: false,
      'tag-prefix': '',
      'filter-by-commitish': false,
    })

    expect(stableDraft).toEqual({
      tag_name: 'v1.0.0',
      draft: true,
      prerelease: false,
    })
  })

  it('should find non-prerelease draft when isPreRelease is false', async () => {
    localMocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
    ])

    const { draftRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'tag-prefix': '',
      'filter-by-commitish': false,
      prerelease: false,
    })

    expect(draftRelease).toEqual({
      tag_name: 'v1.0.0',
      draft: true,
      prerelease: false,
    })
  })

  it('should filter releases by semver range and exclude non-semver tags', async () => {
    localMocks.releases.mockResolvedValueOnce([
      {
        tag_name: 'not-a-semver-tag',
        target_commitish: 'master',
        created_at: '2024-06-29T05:45:15Z',
        draft: false,
        prerelease: false,
      },
      {
        tag_name: 'v2.9.0',
        target_commitish: 'master',
        created_at: '2024-06-28T05:45:15Z',
        draft: false,
        prerelease: false,
      },
      {
        tag_name: 'v3.0.0',
        target_commitish: 'master',
        created_at: '2024-06-27T05:45:15Z',
        draft: false,
        prerelease: false,
      },
      {
        tag_name: 'v3.1.0',
        target_commitish: 'master',
        created_at: '2024-06-26T05:45:15Z',
        draft: true,
        prerelease: false,
      },
    ])

    const { draftRelease, lastRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      prerelease: false,
      'filter-by-range': '^3.0.0',
    })

    expect(draftRelease?.tag_name).toBe('v3.1.0')
    expect(lastRelease?.tag_name).toBe('v3.0.0')
    expect(sharedMocks.core.warning).toHaveBeenCalledWith(
      'Failed to coerce semver version for "not-a-semver-tag" : will be excluded from releases considered for drafting.',
    )
    expect(sharedMocks.core.debug).toHaveBeenCalledWith(
      expect.stringContaining('does not satisfy version "2.9.0"'),
    )
    expect(sharedMocks.core.debug).toHaveBeenCalledWith(
      expect.stringContaining('satisfies version "3.0.0"'),
    )
  })

  it('should warn when multiple matching drafts remain after semver range filtering', async () => {
    localMocks.releases.mockResolvedValueOnce([
      {
        tag_name: 'v3.2.0',
        target_commitish: 'master',
        created_at: '2024-06-29T05:45:15Z',
        draft: true,
        prerelease: false,
      },
      {
        tag_name: 'v3.1.0',
        target_commitish: 'master',
        created_at: '2024-06-28T05:45:15Z',
        draft: true,
        prerelease: false,
      },
      {
        tag_name: 'v3.0.0',
        target_commitish: 'master',
        created_at: '2024-06-27T05:45:15Z',
        draft: false,
        prerelease: false,
      },
      {
        tag_name: 'v2.9.0',
        target_commitish: 'master',
        created_at: '2024-06-26T05:45:15Z',
        draft: true,
        prerelease: false,
      },
    ])

    const { draftRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      prerelease: false,
      'filter-by-range': '^3.0.0',
    })

    expect(draftRelease?.tag_name).toBe('v3.2.0')
    expect(sharedMocks.core.warning).toHaveBeenCalledWith(
      'Multiple draft releases found : v3.2.0, v3.1.0',
    )
    expect(sharedMocks.core.warning).toHaveBeenCalledWith(
      'Using the first one returned by GitHub API: v3.2.0',
    )
  })
})
