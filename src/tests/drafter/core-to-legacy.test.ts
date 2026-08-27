import { describe, expect, it } from 'vitest'
import {
  legacyPullRequestKey,
  toLegacyCommit,
  toLegacyPullRequest,
} from '#src/actions/drafter/lib/find-pull-requests/core-to-legacy.ts'

describe('core to legacy GitHub mapping', () => {
  it('hydrates a commit association from its full pull request', () => {
    const pullRequest = toLegacyPullRequest({
      number: 1701,
      title: 'Add GitHub adapter',
      baseRepository: 'release-drafter/release-drafter',
      labels: ['feature'],
    })
    const pullRequestsByKey = new Map([
      [
        legacyPullRequestKey({
          number: pullRequest.number,
          baseRepository: pullRequest.baseRepository?.nameWithOwner,
        }),
        pullRequest,
      ],
    ])

    const commit = toLegacyCommit(
      {
        oid: 'abc123',
        associatedPullRequests: [
          {
            number: 1701,
            baseRepository: 'release-drafter/release-drafter',
          },
        ],
      },
      pullRequestsByKey,
    )

    expect(commit.associatedPullRequests?.nodes).toEqual([pullRequest])
  })
})
