import { findPreviousReleases } from 'src/actions/drafter/lib'
import type { Octokit } from 'src/common/get-octokit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockContext } from '../mocks'

const mocks = vi.hoisted(() => {
  return {
    releases: vi.fn<Octokit['paginate']>(),
  }
})

vi.mock(import('src/common/get-octokit'), async (iom) => {
  const om = await iom()
  process.env.GITHUB_TOKEN = 'test'
  return {
    ...om,
    getOctokit: () => ({
      ...om.getOctokit(),
      paginate: mocks.releases as unknown as Octokit['paginate'],
    }),
  }
})

describe('find previous releases', () => {
  beforeEach(async () => {
    await mockContext('push')
  })

  it('should retrieve last release respecting semver, stripped prefix', async () => {
    mocks.releases.mockResolvedValueOnce([
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
    mocks.releases.mockResolvedValueOnce([
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
    mocks.releases.mockResolvedValueOnce([
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
    mocks.releases.mockResolvedValueOnce([
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
    mocks.releases.mockResolvedValueOnce([
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
    mocks.releases.mockResolvedValueOnce([
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

    mocks.releases.mockResolvedValueOnce([
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
    mocks.releases.mockResolvedValueOnce([
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
})
