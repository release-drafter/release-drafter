import { describe, expect, it } from 'vitest'
import { getConfig } from '#gh-actions/check-pr-title/get-config.ts'
import { mocks } from '#tests/mocks/index.ts'

describe('get check PR title config', () => {
  it('parses conventional categories from the composed _extends result', async () => {
    mocks.config.mockReturnValue('config-check-pr-title')
    mocks.getContextsConfigWasFetchedFrom.mockReturnValue([
      {
        filepath: '.github/release-drafter.yml',
        scheme: 'github',
        ref: 'main',
        repo: { owner: 'octocat', repo: 'hello-world' },
      },
      {
        filepath: '.github/base.yml',
        scheme: 'github',
        ref: undefined,
        repo: { owner: 'octocat', repo: '.github' },
      },
    ])

    const config = await getConfig('release-drafter.yml', 'token')

    expect(config.categories).toEqual([
      expect.objectContaining({ title: 'Features' }),
    ])
    expect(mocks.core.info).toHaveBeenCalledTimes(2)
  })
})
