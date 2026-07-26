import { type DraftReleaseOptions, draftRelease } from 'release-drafter'
import { describe, expect, it } from 'vitest'

// Resolves through the package `exports` map, so this needs `dist/` to exist.
// That is why `npm run all` builds before running the tests; on a fresh clone
// `npm run test:run` alone cannot satisfy this import.

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
