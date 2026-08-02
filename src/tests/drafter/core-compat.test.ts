import { describe, expect, it } from 'vitest'
import {
  toCoreCommit,
  toCorePullRequest,
  toLegacyReleasePayload,
} from '#src/actions/drafter/lib/core-compat.ts'

describe('GitHub Action core compatibility', () => {
  it('normalizes legacy GraphQL pull request label connections', () => {
    const pullRequest = {
      number: 1693,
      title: 'Extract the core package',
      labels: {
        nodes: [{ name: 'feature' }, null, { name: null }, { name: 'core' }],
      },
    } as unknown as Parameters<typeof toCorePullRequest>[0]

    expect(toCorePullRequest(pullRequest).labels).toEqual(['feature', 'core'])
  })

  it('preserves an absent author connection for the single-author fallback', () => {
    const commit = {
      oid: 'abc123',
      author: { name: 'Timon', user: { login: 'TimonVS' } },
    } as unknown as Parameters<typeof toCoreCommit>[0]

    expect(toCoreCommit(commit)).toMatchObject({
      author: { name: 'Timon', login: 'TimonVS' },
      authors: undefined,
    })
  })

  it('converts the core makeLatest field back to the legacy make_latest field', () => {
    const payload = toLegacyReleasePayload({
      name: 'v8.0.0',
      tag: 'v8.0.0',
      body: 'Release notes',
      targetCommitish: 'main',
      prerelease: false,
      makeLatest: false,
      draft: true,
    })

    expect(payload.make_latest).toBe(false)
    expect(payload).not.toHaveProperty('makeLatest')
  })
})
