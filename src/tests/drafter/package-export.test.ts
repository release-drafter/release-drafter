import { type DraftReleaseOptions, draftRelease } from 'release-drafter'
import { describe, expect, it } from 'vitest'

describe('package drafter export', () => {
  it('exports the programmatic drafter', () => {
    const options: DraftReleaseOptions = {
      repo: { owner: 'owner', repo: 'repository' },
      token: 'token',
    }

    expect(options.repo.repo).toBe('repository')
    expect(draftRelease).toBeTypeOf('function')
  })
})
