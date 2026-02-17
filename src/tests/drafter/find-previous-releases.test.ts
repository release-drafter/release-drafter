import { findPreviousReleases } from 'src/actions/drafter/lib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Octokit } from 'src/common/get-octokit'
import { mockContext } from '../mocks'

const mocks = vi.hoisted(() => {
  return {
    releases: vi.fn<Octokit['paginate']>()
  }
})

vi.mock(import('src/common/get-octokit'), async (iom) => {
  const om = await iom()
  process.env.GITHUB_TOKEN = 'test'
  return {
    ...om,
    getOctokit: () => ({
      ...om.getOctokit(),
      paginate: mocks.releases as unknown as Octokit['paginate']
    })
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
        created_at: '2021-06-29T05:45:15Z'
      },
      {
        tag_name: 'test-1.0.0',
        target_commitish: 'master',
        created_at: '2022-06-29T05:45:15Z'
      }
    ])

    const { lastRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': 'test-',
      'include-pre-releases': false
    })

    expect(lastRelease?.tag_name).toEqual('test-1.0.1')
  })

  it('should return last release without draft and prerelease', async () => {
    mocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true }
    ])

    const { lastRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      'include-pre-releases': false
    })

    expect(lastRelease).toEqual({
      tag_name: 'v1.0.1',
      draft: false,
      prerelease: false
    })
  })

  it('should return last draft release', async () => {
    mocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true }
    ])

    const { draftRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      'include-pre-releases': false
    })

    expect(draftRelease).toEqual({
      tag_name: 'v1.0.0',
      draft: true,
      prerelease: false
    })
  })

  it('should return last prerelease as last release when includePreReleases is true', async () => {
    mocks.releases.mockResolvedValueOnce([
      { tag_name: 'v1.0.0', draft: true, prerelease: false },
      { tag_name: 'v1.0.1', draft: false, prerelease: false },
      { tag_name: 'v1.0.2-rc.1', draft: true, prerelease: true }
    ])

    const { draftRelease, lastRelease } = await findPreviousReleases({
      commitish: 'refs/heads/master',
      'filter-by-commitish': false,
      'tag-prefix': '',
      'include-pre-releases': true
    })

    expect(draftRelease).toEqual({
      tag_name: 'v1.0.2-rc.1',
      draft: true,
      prerelease: true
    })

    expect(lastRelease).toEqual({
      tag_name: 'v1.0.1',
      draft: false,
      prerelease: false
    })
  })
})
